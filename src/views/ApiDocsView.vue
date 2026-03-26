<template>
  <div class="api-docs">
    <div class="page-header">
      <h1>{{ $t('api.title') }}</h1>
      <el-tag effect="dark" type="success" round>
        Base URL: {{ BASE_URL }}
      </el-tag>
    </div>

    <p class="page-desc" v-html="$t('api.desc')"></p>

    <!-- Quick Start -->
    <el-card class="doc-section">
      <template #header>
        <div class="section-title">
          <el-icon><Lightning /></el-icon>
          {{ $t('api.quickStart') }}
        </div>
      </template>
      <div class="code-block">
        <div class="code-header">
          <span>cURL — Login & Get Balance</span>
          <el-button text size="small" @click="copy(quickStartCode)">Copy</el-button>
        </div>
        <pre><code>{{ quickStartCode }}</code></pre>
      </div>
    </el-card>

    <!-- Endpoints -->
    <div v-for="ep in endpoints" :key="ep.method + ep.path" class="endpoint-card">
      <el-card>
        <template #header>
          <div class="endpoint-header">
            <div class="endpoint-title">
              <el-tag :type="ep.method === 'GET' ? 'success' : 'primary'" effect="dark" size="small" class="method-tag">
                {{ ep.method }}
              </el-tag>
              <code class="endpoint-path">/api{{ ep.path }}</code>
              <span class="endpoint-desc">{{ ep.description }}</span>
            </div>
            
            <el-button 
              type="primary" 
              plain 
              size="small" 
              @click="toggleTest(ep.path, ep.reqExample)"
              :class="{ 'is-active': activeTest === ep.path }"
            >
              <el-icon class="el-icon--left"><VideoPlay /></el-icon>
              {{ activeTest === ep.path ? $t('api.closePlayground') : $t('api.testApi') }}
            </el-button>
          </div>
        </template>

        <div class="endpoint-body">
          <!-- API Playground -->
          <el-collapse-transition>
            <div v-show="activeTest === ep.path" class="playground-wrapper">
              <div class="playground">
                <div class="pg-header">
                  <el-icon><Monitor /></el-icon> {{ $t('api.playground') }}
                </div>
                
                <div class="pg-body">
                  <!-- Request Editor -->
                  <div class="pg-request" v-if="ep.method !== 'GET'">
                    <div class="pg-label">{{ $t('api.reqBody') }}</div>
                    <el-input
                      v-model="testPayloads[ep.path]"
                      type="textarea"
                      :rows="6"
                      class="mono-textarea"
                      placeholder="{}"
                      resize="vertical"
                    />
                  </div>

                  <!-- Actions -->
                  <div class="pg-actions">
                    <el-button 
                      type="success" 
                      @click="sendTest(ep)" 
                      :loading="testLoading"
                      class="send-btn"
                    >
                      <el-icon class="el-icon--left"><Position /></el-icon>
                      {{ $t('api.sendReq') }}
                    </el-button>
                  </div>

                  <!-- Response Viewer -->
                  <div class="pg-response" v-if="testResponses[ep.path]">
                    <div class="pg-label response-label">
                      <span>{{ $t('api.response') }}</span>
                      <div class="response-meta">
                        <el-tag 
                          :type="testResponses[ep.path]?.status === 200 ? 'success' : 'danger'" 
                          size="small" 
                          effect="dark"
                          round
                        >
                          {{ testResponses[ep.path]?.status }}
                        </el-tag>
                        <span class="response-time">{{ testResponses[ep.path]?.ms }} ms</span>
                      </div>
                    </div>
                    <div class="code-block small response-block">
                      <pre><code>{{ JSON.stringify(testResponses[ep.path]?.data, null, 2) }}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-transition>

          <!-- Request Dictionary Table -->
          <div class="param-section" v-if="ep.body">
            <h4>{{ $t('api.reqBody') }}</h4>
            <el-table :data="ep.body" style="width: 100%" size="small">
              <el-table-column prop="field" :label="$t('api.field')" width="150" />
              <el-table-column prop="type" :label="$t('api.type')" width="100" />
              <el-table-column prop="required" :label="$t('api.required')" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small" effect="plain" round>
                    {{ row.required ? $t('api.yes') : $t('api.no') }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="desc" :label="$t('transactions.description')" />
            </el-table>
          </div>

          <!-- Examples Grid -->
          <div class="example-grid">
            <div class="example-block" v-if="ep.reqExample">
              <h4>{{ $t('api.reqEx') }}</h4>
              <div class="code-block small">
                <div class="code-header">
                  <span>{{ ep.exampleLang || 'JSON' }}</span>
                  <el-button text size="small" @click="copy(ep.reqExample)">Copy</el-button>
                </div>
                <pre><code>{{ ep.reqExample }}</code></pre>
              </div>
            </div>
            <div class="example-block">
              <h4>{{ $t('api.resEx') }}</h4>
              <div class="code-block small">
                <div class="code-header">
                  <span>JSON</span>
                  <el-button text size="small" @click="copy(ep.resExample)">Copy</el-button>
                </div>
                <pre><code>{{ ep.resExample }}</code></pre>
              </div>
            </div>
          </div>

          <!-- Integration Code -->
          <div class="integration" v-if="ep.integration">
            <h4>{{ $t('api.integration') }}</h4>
            <div class="code-block small">
              <div class="code-header">
                <span>TypeScript</span>
                <el-button text size="small" @click="copy(ep.integration)">Copy</el-button>
              </div>
              <pre><code>{{ ep.integration }}</code></pre>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Node.js SDK Example -->
    <el-card class="doc-section">
      <template #header>
        <div class="section-title">
          <el-icon><Connection /></el-icon>
          {{ $t('api.fullEx') }}
        </div>
      </template>
      <div class="code-block">
        <div class="code-header">
          <span>TypeScript</span>
          <el-button text size="small" @click="copy(fullExample)">Copy</el-button>
        </div>
        <pre><code>{{ fullExample }}</code></pre>
      </div>
    </el-card>

    <!-- Python Example -->
    <el-card class="doc-section">
      <template #header>
        <div class="section-title">
          <el-icon><Promotion /></el-icon>
          {{ $t('api.pythonEx') }}
        </div>
      </template>
      <div class="code-block">
        <div class="code-header">
          <span>Python</span>
          <el-button text size="small" @click="copy(pythonExample)">Copy</el-button>
        </div>
        <pre><code>{{ pythonExample }}</code></pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
import { Lightning, Connection, Promotion, VideoPlay, Monitor, Position } from "@element-plus/icons-vue";
import api from "../api";
const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("Copied!");
  } catch {
    ElMessage.error("Copy failed");
  }
};

// ─── API Playground State ─────────────────────────────────────────────────

const activeTest = ref<string | null>(null);
const testPayloads = reactive<Record<string, string>>({});
const testResponses = reactive<Record<string, { status: number, data: any, ms: number } | null>>({});
const testLoading = ref(false);

const toggleTest = (path: string, defaultPayload: string | null) => {
  if (activeTest.value === path) {
    activeTest.value = null;
  } else {
    activeTest.value = path;
    if (!testPayloads[path]) {
      testPayloads[path] = defaultPayload || "{}\n";
    }
  }
};

const sendTest = async (ep: any) => {
  testLoading.value = true;
  const start = Date.now();
  
  try {
    let payload = undefined;
    if (ep.method !== 'GET') {
      try {
        payload = JSON.parse(testPayloads[ep.path] || "{}");
      } catch {
        ElMessage.error("Invalid JSON payload");
        testLoading.value = false;
        return;
      }
    }
    
    let res;
    if (ep.method === 'GET') {
      res = await api.get(ep.path);
    } else {
      res = await api.post(ep.path, payload);
    }
    
    testResponses[ep.path] = {
      status: res.status,
      data: res.data,
      ms: Date.now() - start
    };
  } catch (err: any) {
    testResponses[ep.path] = {
      status: err.response?.status || 500,
      data: err.response?.data || { success: false, message: err.message },
      ms: Date.now() - start
    };
  } finally {
    testLoading.value = false;
  }
};

// ─── Docs Content ────────────────────────────────────────────────────────

const BASE_URL = window.location.origin + '/api';

const quickStartCode = `# 1. Login (captcha tự động OCR)
curl -X POST ${BASE_URL}/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "0912345678", "password": "your_password"}'

# 2. Lấy số dư
curl -X POST ${BASE_URL}/balance \\
  -H "Content-Type: application/json"

# 3. Lịch sử giao dịch
curl -X POST ${BASE_URL}/transactions \\
  -H "Content-Type: application/json" \\
  -d '{"accountNumber": "0912345678", "fromDate": "01/03/2026", "toDate": "27/03/2026"}'

# 4. Generate dataEnc (không cần login)
curl -X POST ${BASE_URL}/encrypt \\
  -H "Content-Type: application/json" \\
  -d '{"payload": {"userId": "test", "action": "check"}, "sessionId": "0"}'`;

const endpoints = [
  {
    method: "GET",
    path: "/status",
    description: "Kiểm tra trạng thái server & session",
    body: null,
    reqExample: null,
    resExample: `{
  "status": "ok",
  "loggedIn": true,
  "username": "0912345678",
  "sessionAge": 120
}`,
    integration: `const res = await fetch("${BASE_URL}/status");
const data = await res.json();
console.log(data.loggedIn); // true/false`,
  },
  {
    method: "POST",
    path: "/login",
    description: "Đăng nhập (tự động giải captcha bằng AI OCR)",
    body: [
      { field: "username", type: "string", required: true, desc: "Số điện thoại / tên đăng nhập MB Bank" },
      { field: "password", type: "string", required: true, desc: "Mật khẩu (plaintext, server sẽ hash MD5)" },
    ],
    reqExample: `{
  "username": "0912345678",
  "password": "your_password"
}`,
    resExample: `{
  "success": true,
  "message": "Login successful",
  "attempts": 1,
  "data": {
    "sessionId": "abc123...",
    "customerName": "DANG QUOC HUY",
    "lastLogin": "27/03/2026 01:00:00"
  }
}`,
    integration: `const res = await fetch("${BASE_URL}/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "0912345678",
    password: "your_password",
  }),
});
const data = await res.json();
if (data.success) {
  console.log("Đăng nhập thành công!", data.data.customerName);
  // Session được lưu tự động trên server
}`,
  },
  {
    method: "POST",
    path: "/balance",
    description: "Lấy số dư tất cả tài khoản (cần login trước)",
    body: null,
    reqExample: `{}`,
    exampleLang: "JSON",
    resExample: `{
  "success": true,
  "data": {
    "totalBalance": 15000000,
    "currencyEquivalent": "VND",
    "accounts": [
      {
        "number": "0912345678",
        "name": "DANG QUOC HUY",
        "currency": "VND",
        "balance": 15000000
      }
    ]
  }
}`,
    integration: `const res = await fetch("${BASE_URL}/balance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
const { data } = await res.json();
console.log("Tổng số dư:", data.data.totalBalance);
data.data.accounts.forEach(a => {
  console.log(\`  \${a.name}: \${a.balance} \${a.currency}\`);
});`,
  },
  {
    method: "POST",
    path: "/transactions",
    description: "Lịch sử giao dịch theo khoảng thời gian (cần login)",
    body: [
      { field: "accountNumber", type: "string", required: true, desc: "Số tài khoản MB Bank" },
      { field: "fromDate", type: "string", required: true, desc: "Ngày bắt đầu (DD/MM/YYYY)" },
      { field: "toDate", type: "string", required: true, desc: "Ngày kết thúc (DD/MM/YYYY), tối đa 90 ngày" },
    ],
    reqExample: `{
  "accountNumber": "0912345678",
  "fromDate": "01/03/2026",
  "toDate": "27/03/2026"
}`,
    resExample: `{
  "success": true,
  "data": [
    {
      "transactionDate": "27/03/2026",
      "creditAmount": 500000,
      "debitAmount": 0,
      "description": "NGUYEN VAN A chuyen tien",
      "beneficiaryName": "NGUYEN VAN A",
      "beneficiaryBank": "Vietcombank",
      "refNo": "FT26086..."
    }
  ]
}`,
    integration: `const res = await fetch("${BASE_URL}/transactions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    accountNumber: "0912345678",
    fromDate: "01/03/2026",
    toDate: "27/03/2026",
  }),
});
const { data } = await res.json();
data.data.forEach(tx => {
  const type = tx.creditAmount > 0 ? "IN" : "OUT";
  const amount = tx.creditAmount || tx.debitAmount;
  console.log(\`[\${type}] \${amount} - \${tx.description}\`);
});`,
  },
  {
    method: "POST",
    path: "/encrypt",
    description: "Generate dataEnc từ JSON payload (không cần login)",
    body: [
      { field: "payload", type: "object", required: true, desc: "JSON object cần mã hóa" },
      { field: "sessionId", type: "string", required: false, desc: 'Session ID (default: "0")' },
    ],
    reqExample: `{
  "payload": {
    "userId": "MY_USER",
    "action": "TEST",
    "timestamp": 1711497600000
  },
  "sessionId": "0"
}`,
    resExample: `{
  "success": true,
  "dataEnc": "eyJhbGciOiJIUzI1NiIs..."
}`,
    integration: `const res = await fetch("${BASE_URL}/encrypt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: { userId: "test", action: "check" },
    sessionId: "0",
  }),
});
const { dataEnc } = await res.json();
console.log("dataEnc:", dataEnc);`,
  },
  {
    method: "POST",
    path: "/warmup",
    description: "Pre-download WASM binary (tăng tốc lần encrypt đầu tiên)",
    body: null,
    reqExample: `{}`,
    resExample: `{
  "success": true,
  "message": "WASM engine ready"
}`,
    integration: null,
  },
];

const fullExample = `import axios from "axios";

const API = axios.create({
  baseURL: "${BASE_URL}",
  headers: { "Content-Type": "application/json" },
});

async function main() {
  // 1. Login
  const { data: loginRes } = await API.post("/login", {
    username: "0912345678",
    password: "your_password",
  });
  console.log("Login:", loginRes.message, \`(\${loginRes.attempts} attempts)\`);

  if (!loginRes.success) {
    console.error("Login failed:", loginRes.message);
    return;
  }

  // 2. Get Balance
  const { data: balanceRes } = await API.post("/balance");
  console.log("Total Balance:", balanceRes.data.totalBalance, "VND");

  // 3. Get Transactions (last 30 days)
  const now = new Date();
  const ago = new Date(now.getTime() - 30 * 86400000);
  const fmt = (d: Date) =>
    \`\${String(d.getDate()).padStart(2, "0")}/\${String(d.getMonth() + 1).padStart(2, "0")}/\${d.getFullYear()}\`;

  const { data: txRes } = await API.post("/transactions", {
    accountNumber: balanceRes.data.accounts[0].number,
    fromDate: fmt(ago),
    toDate: fmt(now),
  });

  console.log(\`Found \${txRes.data.length} transactions\`);
  txRes.data.forEach((tx: any) => {
    const type = tx.creditAmount > 0 ? "+" : "-";
    const amount = tx.creditAmount || tx.debitAmount;
    console.log(\`  \${tx.transactionDate} \${type}\${amount} \${tx.description}\`);
  });

  // 4. Generate dataEnc (standalone)
  const { data: encRes } = await API.post("/encrypt", {
    payload: { userId: "test", timestamp: Date.now() },
  });
  console.log("dataEnc:", encRes.dataEnc);
}

main().catch(console.error);`;

const pythonExample = `import requests

BASE = "${BASE_URL}"

# 1. Login
login = requests.post(f"{BASE}/login", json={
    "username": "0912345678",
    "password": "your_password",
}).json()
print(f"Login: {login['message']} ({login['attempts']} attempts)")

if not login["success"]:
    exit(1)

# 2. Balance
balance = requests.post(f"{BASE}/balance").json()
print(f"Total: {balance['data']['totalBalance']} VND")

for acct in balance["data"]["accounts"]:
    print(f"  {acct['name']}: {acct['balance']} {acct['currency']}")

# 3. Transactions
txs = requests.post(f"{BASE}/transactions", json={
    "accountNumber": "0912345678",
    "fromDate": "01/03/2026",
    "toDate": "27/03/2026",
}).json()

for tx in txs["data"]:
    amt = tx["creditAmount"] or tx["debitAmount"]
    sign = "+" if tx["creditAmount"] else "-"
    print(f"  {tx['transactionDate']} {sign}{amt} {tx['description']}")

# 4. Generate dataEnc (no login needed)
enc = requests.post(f"{BASE}/encrypt", json={
    "payload": {"userId": "test", "action": "check"},
    "sessionId": "0",
}).json()
print(f"dataEnc: {enc['dataEnc']}")`;
</script>

<style scoped>
.api-docs {
  max-width: 1000px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 28px;
  line-height: 1.6;
}

.page-desc code {
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--accent);
}

/* ─── Sections ─────────────────────────────── */

.doc-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

/* ─── Endpoint Cards ───────────────────────── */

.endpoint-card {
  margin-bottom: 16px;
}

.endpoint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.endpoint-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.method-tag {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
}

.endpoint-path {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}

.endpoint-desc {
  color: var(--text-secondary);
  font-size: 13px;
}

.endpoint-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
}

/* ─── API Playground ───────────────────────── */

.playground-wrapper {
  margin-bottom: 16px;
}

.playground {
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  background: rgba(64, 158, 255, 0.04);
  overflow: hidden;
}

.pg-header {
  padding: 12px 16px;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pg-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mono-textarea :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: var(--bg-input);
}

.send-btn {
  width: 100%;
}

.response-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.response-time {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: none;
  font-variant-numeric: tabular-nums;
}

.response-block {
  max-height: 400px;
  overflow-y: auto;
  border-color: rgba(103, 194, 58, 0.3) !important;
}

.response-block pre {
  margin: 0;
  padding: 16px;
}

.response-block code {
  color: #a6e22e !important;
}

/* ─── Params ───────────────────────────────── */

.param-section h4,
.example-block h4,
.integration h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

/* ─── Code Blocks ──────────────────────────── */

.code-block {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.code-block.small {
  font-size: 12px;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.code-block pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre;
}

.code-block.small code {
  font-size: 12px;
}

/* ─── Example Grid ─────────────────────────── */

.example-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .endpoint-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .example-grid {
    grid-template-columns: 1fr;
  }
}
</style>
