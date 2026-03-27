/**
 * Captcha OCR Service
 *
 * Uses a purpose-trained ONNX model to recognize Core Bank captcha images.
 * Model auto-downloads from GitHub on first run and is cached locally.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as ort from "onnxruntime-node";

// ─── Constants ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = join(__dirname, "../model.onnx");

/** Character set: 0-9 a-z A-Z (sorted) — matches the training data */
const CHARSET: string[] = [];
for (let i = 0; i < 10; i++) CHARSET.push(String(i));
for (let i = 97; i <= 122; i++) CHARSET.push(String.fromCharCode(i));
for (let i = 65; i <= 90; i++) CHARSET.push(String.fromCharCode(i));
CHARSET.sort();

// ─── ONNX Session ───────────────────────────────────────────────────────────

let session: ort.InferenceSession | null = null;

async function checkModelExists(): Promise<void> {
  if (!existsSync(MODEL_PATH)) {
    throw new Error(`OCR model not found at ${MODEL_PATH}. Please provide model.onnx manually.`);
  }
}

async function getSession(): Promise<ort.InferenceSession> {
  if (session) return session;
  await checkModelExists();
  session = await ort.InferenceSession.create(MODEL_PATH);
  return session;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Recognize captcha text from an image buffer.
 * Returns the recognized text (6 chars), or null if recognition fails.
 */
export async function recognizeCaptcha(
  imageBuffer: Buffer
): Promise<string | null> {
  const sess = await getSession();

  // Preprocess: grayscale → resize to 160×50 → normalize to [0, 1]
  const raw = await sharp(imageBuffer)
    .grayscale()
    .resize(160, 50)
    .raw()
    .toBuffer();

  const pixels = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    pixels[i] = raw[i] / 255.0;
  }

  // Input shape: [batch=1, channels=1, height=50, width=160]
  const tensor = new ort.Tensor("float32", pixels, [1, 1, 50, 160]);
  const inputName = sess.inputNames[0];
  const results = await sess.run({ [inputName]: tensor });

  // Decode: argmax per timestep → map to CHARSET
  const output = Object.values(results)[0];
  const data = output.data as Float32Array;
  const dims = output.dims as readonly number[];
  const seqLen = dims[1];
  const numClasses = dims[2];

  let text = "";
  for (let s = 0; s < seqLen; s++) {
    let maxIdx = 0;
    let maxVal = data[s * numClasses];
    for (let c = 1; c < numClasses; c++) {
      const val = data[s * numClasses + c];
      if (val > maxVal) {
        maxVal = val;
        maxIdx = c;
      }
    }
    if (maxIdx >= 0 && maxIdx < CHARSET.length) {
      text += CHARSET[maxIdx];
    }
  }

  // Core Bank captcha is always 6 characters
  if (text.length !== 6) return null;
  return text;
}

/** Pre-download the model and initialize ONNX runtime */
export async function warmupOCR(): Promise<void> {
  await getSession();
}
