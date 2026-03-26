/**
 * MB Bank API Service
 *
 * Clean implementation of MB Bank's internet banking API.
 * Handles login, balance, and transaction history.
 */

import { createHash } from "node:crypto";
import { Client } from "undici";
import { encrypt } from "./wasm-engine";
import { recognizeCaptcha } from "./captcha-ocr";
import type {
  CaptchaResponse,
  SessionState,
  BalanceSummary,
  AccountBalance,
  Transaction,
} from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_URL = "https://online.mbbank.com.vn";

const DEFAULT_HEADERS: Record<string, string> = {
  "Cache-Control": "max-age=0",
  Accept: "application/json, text/plain, */*",
  Authorization:
    "Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/pl/login?returnUrl=%2F`,
  "Content-Type": "application/json; charset=UTF-8",
  app: "MB_WEB",
  "elastic-apm-traceparent":
    "00-55b950e3fcabc785fa6db4d7deb5ef73-8dbd60b04eda2f34-01",
  "Sec-Ch-Ua":
    '"Not.A/Brand";v="8", "Chromium";v="134", "Google Chrome";v="134"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const FPR = "c7a1beebb9400375bb187daa33de9659";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}` +
    `${String(now.getMilliseconds()).slice(0, 2)}`
  );
}

function generateDeviceId(): string {
  return `s1rmi184-mbib-0000-0000-${timestamp()}`;
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

// ─── MB Bank Service ────────────────────────────────────────────────────────

export class MBBankService {
  private client = new Client(BASE_URL);
  private session: SessionState | null = null;

  /** Get current session info */
  getSession(): SessionState | null {
    return this.session;
  }

  /** Request a captcha image for login */
  async getCaptcha(): Promise<{ imageBase64: string; deviceId: string }> {
    const deviceId = generateDeviceId();
    const refNo = timestamp();

    const res = await this.client.request({
      method: "POST",
      path: "/api/retail-internetbankingms/getCaptchaImage",
      headers: {
        ...DEFAULT_HEADERS,
        "X-Request-Id": refNo,
        Deviceid: deviceId,
        Refno: refNo,
      },
      body: JSON.stringify({
        sessionId: "",
        refNo,
        deviceIdCommon: deviceId,
      }),
    });

    const data = (await res.body.json()) as CaptchaResponse;

    // Store deviceId for the upcoming login
    this.session = {
      sessionId: "",
      deviceId,
      username: "",
      createdAt: Date.now(),
    };

    return {
      imageBase64: data.imageString,
      deviceId,
    };
  }

  /**
   * Automatic login: fetches captcha, solves it with OCR, and logs in.
   * Retries up to `maxRetries` times on captcha failure.
   */
  async autoLogin(
    username: string,
    password: string,
    maxRetries = 5
  ): Promise<{ success: boolean; message: string; attempts: number; data?: unknown }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Login attempt ${attempt}/${maxRetries}...`);

      // 1. Get captcha
      const { imageBase64 } = await this.getCaptcha();
      const imageBuffer = Buffer.from(imageBase64, "base64");

      // 2. OCR solve
      const captchaText = await recognizeCaptcha(imageBuffer);
      if (!captchaText) {
        console.log(`   ❌ OCR failed to recognize captcha, retrying...`);
        continue;
      }
      console.log(`   🔍 OCR result: ${captchaText}`);

      // 3. Attempt login
      const result = await this.login(username, password, captchaText);

      if (result.success) {
        console.log(`   ✅ Login successful on attempt ${attempt}`);
        return { ...result, attempts: attempt };
      }

      // If captcha was wrong, retry
      if (result.message.includes("Captcha") || result.message.includes("GW283")) {
        console.log(`   ❌ Captcha incorrect, retrying...`);
        continue;
      }

      // Other errors (wrong password, locked, etc.) - don't retry
      return { ...result, attempts: attempt };
    }

    return {
      success: false,
      message: `Failed after ${maxRetries} attempts (captcha OCR could not solve)`,
      attempts: maxRetries,
    };
  }

  /** Login with username, password, and captcha */
  async login(
    username: string,
    password: string,
    captcha: string
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    const deviceId = this.session?.deviceId || generateDeviceId();
    const refNo = timestamp();

    const requestData = {
      userId: username,
      password: md5(password),
      captcha,
      ibAuthen2faString: FPR,
      sessionId: null,
      refNo,
      deviceIdCommon: deviceId,
    };

    const dataEnc = await encrypt(requestData, "0");

    const res = await this.client.request({
      method: "POST",
      path: "/api/retail_web/internetbanking/v2.0/doLogin",
      headers: {
        ...DEFAULT_HEADERS,
        "X-Request-Id": refNo,
        Deviceid: deviceId,
        Refno: refNo,
      },
      body: JSON.stringify({ dataEnc }),
    });

    const body = (await res.body.json()) as any;

    if (!body.result) {
      return { success: false, message: "Unknown error: no result in response" };
    }

    if (body.result.ok) {
      this.session = {
        sessionId: body.sessionId,
        deviceId,
        username,
        createdAt: Date.now(),
      };

      return {
        success: true,
        message: "Login successful",
        data: {
          sessionId: body.sessionId,
          customerName: body.cust?.nm,
          lastLogin: body.cust?.lastLogin,
        },
      };
    }

    if (body.result.responseCode === "GW283") {
      return { success: false, message: "Captcha incorrect, please try again" };
    }

    return {
      success: false,
      message: `(${body.result.responseCode}) ${body.result.message}`,
    };
  }

  /** Fetch account balances */
  async getBalance(): Promise<BalanceSummary | null> {
    const data = await this.authenticatedRequest(
      "/api/retail-accountms/accountms/getBalance"
    );

    if (!data) return null;

    const accounts: AccountBalance[] = [];

    for (const acct of data.acct_list || []) {
      accounts.push({
        number: acct.acctNo,
        name: acct.acctNm,
        currency: acct.ccyCd,
        balance: acct.currentBalance,
      });
    }

    for (const acct of data.internationalAcctList || []) {
      accounts.push({
        number: acct.acctNo,
        name: acct.acctNm,
        currency: acct.ccyCd,
        balance: acct.currentBalance,
      });
    }

    return {
      totalBalance: data.totalBalanceEquivalent,
      currencyEquivalent: data.currencyEquivalent,
      accounts,
    };
  }

  /** Fetch transaction history for an account */
  async getTransactions(
    accountNumber: string,
    fromDate: string, // DD/MM/YYYY
    toDate: string // DD/MM/YYYY
  ): Promise<Transaction[]> {
    const data = await this.authenticatedRequest(
      "/api/retail-transactionms/transactionms/get-account-transaction-history",
      { accountNo: accountNumber, fromDate, toDate }
    );

    if (!data?.transactionHistoryList) return [];

    return data.transactionHistoryList.map((tx: any): Transaction => ({
      postDate: tx.postingDate,
      transactionDate: tx.transactionDate,
      accountNumber: tx.accountNo,
      creditAmount: tx.creditAmount,
      debitAmount: tx.debitAmount,
      currency: tx.currency,
      description: tx.description,
      availableBalance: tx.availableBalance,
      refNo: tx.refNo,
      beneficiaryName: tx.benAccountName,
      beneficiaryBank: tx.bankName,
      beneficiaryAccount: tx.benAccountNo,
      type: tx.transactionType,
    }));
  }

  /** Make an authenticated API request */
  private async authenticatedRequest(
    path: string,
    extraBody: Record<string, unknown> = {}
  ): Promise<any> {
    if (!this.session?.sessionId) {
      throw new Error("Not logged in");
    }

    const refNo = `${this.session.username}-${timestamp()}`;

    const body = {
      sessionId: this.session.sessionId,
      refNo,
      deviceIdCommon: this.session.deviceId,
      ...extraBody,
    };

    const res = await this.client.request({
      method: "POST",
      path,
      headers: {
        ...DEFAULT_HEADERS,
        "X-Request-Id": refNo,
        Deviceid: this.session.deviceId,
        Refno: refNo,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.body.json()) as any;

    if (!data?.result) return null;

    if (data.result.ok) return data;

    if (data.result.responseCode === "GW200") {
      // Session expired
      this.session = null;
      throw new Error("Session expired, please login again");
    }

    throw new Error(
      `Request failed (${data.result.responseCode}): ${data.result.message}`
    );
  }
}
