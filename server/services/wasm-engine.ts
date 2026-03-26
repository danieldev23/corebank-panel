/**
 * WASM Encryption Engine
 *
 * Downloads MB Bank's WASM binary and provides the Go runtime bridge
 * to execute the `bder()` encryption function natively in Node.js.
 */

import { request } from "undici";

// ─── Global polyfills required by Go WASM ───────────────────────────────────

const win: Record<string, unknown> = {
  globalThis,
  document: { welovemb: true },
};

(globalThis as any).window = win;
(globalThis as any).location = new URL("https://online.mbbank.com.vn/pl/login");

// ─── Constants ──────────────────────────────────────────────────────────────

const WASM_URL = "https://online.mbbank.com.vn/assets/wasm/main.wasm";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  Origin: "https://online.mbbank.com.vn",
  Referer: "https://online.mbbank.com.vn/",
};

// ─── Async helper (Go runtime uses generators) ─────────────────────────────

function runGenerator(
  _ctx: unknown,
  _args: unknown,
  gen: Generator
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const step = (result: IteratorResult<unknown>) => {
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(
        (v) => {
          try {
            step(gen.next(v));
          } catch (e) {
            reject(e);
          }
        },
        (e) => {
          try {
            step(gen.throw(e));
          } catch (err) {
            reject(err);
          }
        }
      );
    };
    step(gen.next());
  });
}

// ─── Minimal fs polyfill for Go WASM ────────────────────────────────────────

(() => {
  if (!(globalThis as any).fs) {
    const encoder = new TextDecoder("utf-8");
    let buf = "";

    (globalThis as any).fs = {
      constants: {
        O_WRONLY: -1,
        O_RDWR: -1,
        O_CREAT: -1,
        O_TRUNC: -1,
        O_APPEND: -1,
        O_EXCL: -1,
      },
      writeSync(_fd: number, data: Uint8Array) {
        buf += encoder.decode(data);
        const nl = buf.lastIndexOf("\n");
        if (nl !== -1) {
          buf = buf.substring(nl + 1);
        }
        return data.length;
      },
      write(
        _fd: number,
        data: Uint8Array,
        offset: number,
        length: number,
        position: number | null,
        cb: (err: Error | null, n?: number) => void
      ) {
        if (offset === 0 && length === data.length && position === null) {
          cb(null, this.writeSync(_fd, data));
        } else {
          cb(new Error("not implemented"));
        }
      },
      fsync(_fd: number, cb: (err: Error | null) => void) {
        cb(null);
      },
    };
  }

  if (!(globalThis as any).process) {
    (globalThis as any).process = {
      getuid: () => -1,
      getgid: () => -1,
      geteuid: () => -1,
      getegid: () => -1,
      pid: -1,
      ppid: -1,
    };
  }
})();

// ─── Go Runtime Class ───────────────────────────────────────────────────────

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8");

class GoRuntime {
  argv = ["js"];
  env: Record<string, string> = {};
  exit = (_code: number) => {};

  private _inst!: WebAssembly.Instance;
  private mem!: DataView;
  private _values!: unknown[];
  private _goRefCounts!: number[];
  private _ids!: Map<unknown, number>;
  private _idPool!: number[];
  private _pendingEvent: any = null;
  private _scheduledTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
  private _nextCallbackTimeoutID = 1;
  private exited = false;
  private _exitPromise: Promise<void>;
  private _resolveExitPromise!: () => void;

  importObject: WebAssembly.Imports;

  constructor() {
    this._exitPromise = new Promise((r) => (this._resolveExitPromise = r));

    const self = this;

    const setInt64 = (addr: number, v: number) => {
      self.mem.setUint32(addr, v, true);
      self.mem.setUint32(addr + 4, Math.floor(v / 0x100000000), true);
    };

    const getVal = (addr: number): unknown => {
      const f = self.mem.getFloat64(addr, true);
      if (f === 0) return undefined;
      if (!isNaN(f)) return f;
      return self._values[self.mem.getUint32(addr, true)];
    };

    const setVal = (addr: number, v: unknown) => {
      if (typeof v === "number" && v !== 0) {
        if (isNaN(v)) {
          self.mem.setUint32(addr + 4, 0x7ff80000, true);
          self.mem.setUint32(addr, 0, true);
        } else {
          self.mem.setFloat64(addr, v, true);
        }
        return;
      }
      if (v === undefined) {
        self.mem.setFloat64(addr, 0, true);
        return;
      }

      let id = self._ids.get(v);
      if (id === undefined) {
        id = self._idPool.pop();
        if (id === undefined) id = self._values.length;
        self._values[id] = v;
        self._goRefCounts[id] = 0;
        self._ids.set(v, id);
      }
      self._goRefCounts[id]++;

      let typeFlag = 0;
      switch (typeof v) {
        case "object":
          if (v !== null) typeFlag = 1;
          break;
        case "string":
          typeFlag = 2;
          break;
        case "symbol":
          typeFlag = 3;
          break;
        case "function":
          typeFlag = 4;
          break;
      }
      self.mem.setUint32(addr + 4, 0x7ff80000 | typeFlag, true);
      self.mem.setUint32(addr, id, true);
    };

    const getBytes = (addr: number): Uint8Array => {
      const ptr =
        self.mem.getUint32(addr, true) +
        0x100000000 * self.mem.getInt32(addr + 4, true);
      const len =
        self.mem.getUint32(addr + 8, true) +
        0x100000000 * self.mem.getInt32(addr + 12, true);
      return new Uint8Array(
        (self._inst.exports.mem as WebAssembly.Memory).buffer,
        ptr,
        len
      );
    };

    const getArray = (addr: number): unknown[] => {
      const ptr =
        self.mem.getUint32(addr, true) +
        0x100000000 * self.mem.getInt32(addr + 4, true);
      const len =
        self.mem.getUint32(addr + 8, true) +
        0x100000000 * self.mem.getInt32(addr + 12, true);
      const arr: unknown[] = [];
      for (let i = 0; i < len; i++) arr[i] = getVal(ptr + 8 * i);
      return arr;
    };

    const getString = (addr: number): string => {
      const ptr =
        self.mem.getUint32(addr, true) +
        0x100000000 * self.mem.getInt32(addr + 4, true);
      const len =
        self.mem.getUint32(addr + 8, true) +
        0x100000000 * self.mem.getInt32(addr + 12, true);
      return textDecoder.decode(
        new DataView(
          (self._inst.exports.mem as WebAssembly.Memory).buffer,
          ptr,
          len
        )
      );
    };

    const timeBase = Date.now() - performance.now();

    this.importObject = {
      _gotest: { add: (a: number, b: number) => a + b },
      gojs: {
        "runtime.wasmExit": (sp: number) => {
          sp >>>= 0;
          self.exited = true;
          delete (self as any)._inst;
          delete (self as any)._values;
          delete (self as any)._goRefCounts;
          delete (self as any)._ids;
          delete (self as any)._idPool;
          self.exit(self.mem.getInt32(sp + 8, true));
        },
        "runtime.wasmWrite": (sp: number) => {
          sp >>>= 0;
          const fd =
            self.mem.getUint32(sp + 8, true) +
            0x100000000 * self.mem.getInt32(sp + 12, true);
          const p =
            self.mem.getUint32(sp + 16, true) +
            0x100000000 * self.mem.getInt32(sp + 20, true);
          const n = self.mem.getInt32(sp + 24, true);
          (globalThis as any).fs.writeSync(
            fd,
            new Uint8Array(
              (self._inst.exports.mem as WebAssembly.Memory).buffer,
              p,
              n
            )
          );
        },
        "runtime.resetMemoryDataView": (_sp: number) => {
          self.mem = new DataView(
            (self._inst.exports.mem as WebAssembly.Memory).buffer
          );
        },
        "runtime.nanotime1": (sp: number) => {
          sp >>>= 0;
          setInt64(sp + 8, (timeBase + performance.now()) * 1_000_000);
        },
        "runtime.walltime": (sp: number) => {
          sp >>>= 0;
          const ms = Date.now();
          setInt64(sp + 8, ms / 1000);
          self.mem.setInt32(sp + 16, (ms % 1000) * 1_000_000, true);
        },
        "runtime.scheduleTimeoutEvent": (sp: number) => {
          sp >>>= 0;
          const id = self._nextCallbackTimeoutID++;
          const dur =
            self.mem.getUint32(sp + 8, true) +
            0x100000000 * self.mem.getInt32(sp + 12, true);
          self._scheduledTimeouts.set(
            id,
            setTimeout(() => {
              for (
                self._resume();
                self._scheduledTimeouts.has(id);
                self._resume()
              ) {}
            }, dur)
          );
          self.mem.setInt32(sp + 16, id, true);
        },
        "runtime.clearTimeoutEvent": (sp: number) => {
          sp >>>= 0;
          const id = self.mem.getInt32(sp + 8, true);
          clearTimeout(self._scheduledTimeouts.get(id));
          self._scheduledTimeouts.delete(id);
        },
        "runtime.getRandomData": (sp: number) => {
          sp >>>= 0;
          crypto.getRandomValues(getBytes(sp + 8));
        },
        "syscall/js.finalizeRef": (sp: number) => {
          sp >>>= 0;
          const id = self.mem.getUint32(sp + 8, true);
          self._goRefCounts[id]--;
          if (self._goRefCounts[id] === 0) {
            const v = self._values[id];
            self._values[id] = null;
            self._ids.delete(v);
            self._idPool.push(id);
          }
        },
        "syscall/js.stringVal": (sp: number) => {
          sp >>>= 0;
          setVal(sp + 24, getString(sp + 8));
        },
        "syscall/js.valueGet": (sp: number) => {
          sp >>>= 0;
          const result = Reflect.get(
            getVal(sp + 8) as object,
            getString(sp + 16)
          );
          sp = ((self._inst.exports as any).getsp() as number) >>> 0;
          setVal(sp + 32, result);
        },
        "syscall/js.valueSet": (sp: number) => {
          sp >>>= 0;
          Reflect.set(
            getVal(sp + 8) as object,
            getString(sp + 16),
            getVal(sp + 32)
          );
        },
        "syscall/js.valueDelete": (sp: number) => {
          sp >>>= 0;
          Reflect.deleteProperty(
            getVal(sp + 8) as object,
            getString(sp + 16)
          );
        },
        "syscall/js.valueIndex": (sp: number) => {
          sp >>>= 0;
          setVal(
            sp + 24,
            Reflect.get(
              getVal(sp + 8) as object,
              self.mem.getUint32(sp + 16, true) +
                0x100000000 * self.mem.getInt32(sp + 20, true)
            )
          );
        },
        "syscall/js.valueSetIndex": (sp: number) => {
          sp >>>= 0;
          Reflect.set(
            getVal(sp + 8) as object,
            self.mem.getUint32(sp + 16, true) +
              0x100000000 * self.mem.getInt32(sp + 20, true),
            getVal(sp + 24)
          );
        },
        "syscall/js.valueCall": (sp: number) => {
          sp >>>= 0;
          try {
            const obj = getVal(sp + 8);
            const method = Reflect.get(obj as object, getString(sp + 16));
            const args = getArray(sp + 32);
            const result = Reflect.apply(
              method as Function,
              obj,
              args
            );
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 56, result);
            self.mem.setUint8(sp + 64, 1);
          } catch (err) {
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 56, err);
            self.mem.setUint8(sp + 64, 0);
          }
        },
        "syscall/js.valueInvoke": (sp: number) => {
          sp >>>= 0;
          try {
            const fn = getVal(sp + 8);
            const args = getArray(sp + 16);
            const result = Reflect.apply(fn as Function, undefined, args);
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 40, result);
            self.mem.setUint8(sp + 48, 1);
          } catch (err) {
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 40, err);
            self.mem.setUint8(sp + 48, 0);
          }
        },
        "syscall/js.valueNew": (sp: number) => {
          sp >>>= 0;
          try {
            const ctor = getVal(sp + 8) as new (...args: unknown[]) => unknown;
            const args = getArray(sp + 16);
            const result = Reflect.construct(ctor, args);
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 40, result);
            self.mem.setUint8(sp + 48, 1);
          } catch (err) {
            sp = ((self._inst.exports as any).getsp() as number) >>> 0;
            setVal(sp + 40, err);
            self.mem.setUint8(sp + 48, 0);
          }
        },
        "syscall/js.valueLength": (sp: number) => {
          sp >>>= 0;
          setInt64(sp + 16, (getVal(sp + 8) as any[]).length);
        },
        "syscall/js.valuePrepareString": (sp: number) => {
          sp >>>= 0;
          const str = textEncoder.encode(String(getVal(sp + 8)));
          setVal(sp + 16, str);
          setInt64(sp + 24, str.length);
        },
        "syscall/js.valueLoadString": (sp: number) => {
          sp >>>= 0;
          const str = getVal(sp + 8) as Uint8Array;
          getBytes(sp + 16).set(str);
        },
        "syscall/js.valueInstanceOf": (sp: number) => {
          sp >>>= 0;
          self.mem.setUint8(
            sp + 24,
            (getVal(sp + 8) as object) instanceof
              (getVal(sp + 16) as new (...a: unknown[]) => unknown)
              ? 1
              : 0
          );
        },
        "syscall/js.copyBytesToGo": (sp: number) => {
          sp >>>= 0;
          const dst = getBytes(sp + 8);
          const src = getVal(sp + 32);
          if (
            !(src instanceof Uint8Array || src instanceof Uint8ClampedArray)
          ) {
            self.mem.setUint8(sp + 48, 0);
            return;
          }
          const slice = src.subarray(0, dst.length);
          dst.set(slice);
          setInt64(sp + 40, slice.length);
          self.mem.setUint8(sp + 48, 1);
        },
        "syscall/js.copyBytesToJS": (sp: number) => {
          sp >>>= 0;
          const dst = getVal(sp + 8);
          const src = getBytes(sp + 16);
          if (
            !(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)
          ) {
            self.mem.setUint8(sp + 48, 0);
            return;
          }
          const slice = src.subarray(0, dst.length);
          dst.set(slice);
          setInt64(sp + 40, slice.length);
          self.mem.setUint8(sp + 48, 1);
        },
        debug: (v: unknown) => console.log(v),
      },
    };
  }

  async run(instance: WebAssembly.Instance): Promise<void> {
    this._inst = instance;
    this.mem = new DataView(
      (this._inst.exports.mem as WebAssembly.Memory).buffer
    );
    this._values = [NaN, 0, null, true, false, globalThis, this];
    this._goRefCounts = new Array(this._values.length).fill(Infinity);
    this._ids = new Map<unknown, number>([
      [0, 1],
      [null, 2],
      [true, 3],
      [false, 4],
      [globalThis, 5],
      [this, 6],
    ]);
    this._idPool = [];
    this.exited = false;

    let offset = 4096;
    const strAddr = (s: string): number => {
      const start = offset;
      const encoded = textEncoder.encode(s + "\0");
      new Uint8Array(this.mem.buffer, offset, encoded.length).set(encoded);
      offset += encoded.length;
      if (offset % 8 !== 0) offset += 8 - (offset % 8);
      return start;
    };

    const argc = this.argv.length;
    const argvPtrs: number[] = [];
    this.argv.forEach((arg) => argvPtrs.push(strAddr(arg)));
    argvPtrs.push(0);

    Object.keys(this.env)
      .sort()
      .forEach((key) => argvPtrs.push(strAddr(`${key}=${this.env[key]}`)));
    argvPtrs.push(0);

    const argv = offset;
    argvPtrs.forEach((ptr) => {
      this.mem.setUint32(offset, ptr, true);
      this.mem.setUint32(offset + 4, 0, true);
      offset += 8;
    });

    if (offset >= 12288) {
      throw new Error("command line and environment variables too large");
    }

    (this._inst.exports.run as Function)(argc, argv);
    if (this.exited) this._resolveExitPromise();
    await this._exitPromise;
  }

  _resume() {
    if (this.exited) throw new Error("Go program has already exited");
    (this._inst.exports.resume as Function)();
    if (this.exited) this._resolveExitPromise();
  }

  _makeFuncWrapper(id: number) {
    const self = this;
    return function (this: unknown) {
      const event = { id, this: this, args: arguments, result: undefined };
      self._pendingEvent = event;
      self._resume();
      return event.result;
    };
  }
}

// ─── WASM Engine (public API) ───────────────────────────────────────────────

let cachedWasm: Buffer | null = null;

/** Download WASM binary from MB Bank (cached after first call) */
async function downloadWasm(): Promise<Buffer> {
  if (cachedWasm) return cachedWasm;

  console.log("⬇️  Downloading WASM from MB Bank...");
  const res = await request(WASM_URL, { headers: HEADERS });
  cachedWasm = Buffer.from(await res.body.arrayBuffer());
  console.log(`✅ WASM downloaded (${(cachedWasm.length / 1024).toFixed(0)} KB)`);
  return cachedWasm;
}

/** Encrypt a request payload using MB Bank's WASM `bder()` function */
export async function encrypt(
  data: Record<string, unknown>,
  sessionId = "0"
): Promise<string> {
  const wasmBytes = await downloadWasm();
  const go = new GoRuntime();
  const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
  const instance = (result as WebAssembly.WebAssemblyInstantiatedSource).instance;
  go.run(instance);
  return (globalThis as any).bder(JSON.stringify(data), sessionId);
}

/** Pre-download WASM binary for faster first encryption */
export async function warmup(): Promise<void> {
  await downloadWasm();
}
