/** Core Bank API response wrapper */
export interface MBResponse<T = unknown> {
  result: {
    ok: boolean;
    responseCode: string;
    message: string;
  };
  sessionId?: string;
  [key: string]: T | unknown;
}

/** Captcha response from Core Bank */
export interface CaptchaResponse {
  imageString: string;
  result: {
    ok: boolean;
    responseCode: string;
    message: string;
  };
}

/** Account balance info */
export interface AccountBalance {
  number: string;
  name: string;
  currency: string;
  balance: number;
}

/** Balance summary */
export interface BalanceSummary {
  totalBalance: number;
  currencyEquivalent: string;
  accounts: AccountBalance[];
}

/** Transaction record */
export interface Transaction {
  postDate: string;
  transactionDate: string;
  accountNumber: string;
  creditAmount: number;
  debitAmount: number;
  currency: string;
  description: string;
  availableBalance: number;
  refNo: string;
  beneficiaryName?: string;
  beneficiaryBank?: string;
  beneficiaryAccount?: string;
  type?: string;
}

/** Session state for a logged-in user */
export interface SessionState {
  sessionId: string;
  deviceId: string;
  username: string;
  createdAt: number;
}

/** Login request body */
export interface LoginRequest {
  username: string;
  password: string;
  captcha: string;
}

/** DataEnc request body */
export interface EncryptRequest {
  payload: Record<string, unknown>;
  sessionId?: string;
}
