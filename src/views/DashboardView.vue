<template>
  <div class="dashboard">
    <div class="page-header">
      <h1>{{ $t('dashboard.title') }}</h1>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="fetchBalance" round>
        {{ $t('dashboard.refresh') }}
      </el-button>
    </div>

    <!-- Total Balance Card -->
    <div class="balance-hero glass">
      <div class="balance-label">{{ $t('dashboard.totalBalance') }}</div>
      <div class="balance-amount">
        <span class="currency">₫</span>
        <span class="amount">{{ formatMoney(balance?.totalBalance ?? 0) }}</span>
      </div>
      <div class="balance-currency">{{ balance?.currencyEquivalent || "VND" }}</div>
    </div>

    <!-- Account Cards Grid -->
    <div class="section-header">
      <h2>Accounts</h2>
      <el-tag type="info" effect="dark" round>{{ accounts.length }} {{ $t('dashboard.accounts') }}</el-tag>
    </div>

    <div class="accounts-grid" v-if="accounts.length">
      <el-card
        v-for="acct in accounts"
        :key="acct.number"
        class="account-card"
        shadow="hover"
      >
        <div class="acct-header">
          <div class="acct-icon"><el-icon><CreditCard /></el-icon></div>
          <el-tag size="small" type="info" effect="plain">{{ acct.currency }}</el-tag>
        </div>
        <div class="acct-name">{{ acct.name }}</div>
        <div class="acct-number">{{ maskAccount(acct.number) }}</div>
        <div class="acct-balance">
          <span class="acct-balance-label">{{ $t('dashboard.balance') }}</span>
          <span class="acct-balance-value">{{ formatMoney(acct.balance) }}</span>
        </div>
        <el-button
          type="primary"
          size="small"
          class="acct-action"
          @click="viewTransactions(acct.number)"
        >
          {{ $t('dashboard.viewTransactions') }}
        </el-button>
      </el-card>
    </div>

    <el-empty v-else-if="!loading" :description="$t('dashboard.noAccounts')" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Refresh, CreditCard } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import api from "../api";

interface Account {
  number: string;
  name: string;
  currency: string;
  balance: number;
}

interface BalanceData {
  totalBalance: number;
  currencyEquivalent: string;
  accounts: Account[];
}

const router = useRouter();
const loading = ref(false);
const balance = ref<BalanceData | null>(null);
const accounts = ref<Account[]>([]);

const formatMoney = (val: number | string): string => {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0";
  return n.toLocaleString("vi-VN");
};

const maskAccount = (num: string): string => {
  if (num.length <= 4) return num;
  return "•••• " + num.slice(-4);
};

const fetchBalance = async () => {
  loading.value = true;
  try {
    const { data } = await api.post("/balance");
    if (data.success && data.data) {
      balance.value = data.data;
      accounts.value = data.data.accounts || [];
    } else {
      ElMessage.error(data.message || "Failed to fetch balance");
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    if (msg.includes("Not logged in") || msg.includes("Session expired")) {
      ElMessage.warning("Please login first");
      router.push("/login");
    } else {
      ElMessage.error(msg);
    }
  } finally {
    loading.value = false;
  }
};

const viewTransactions = (accountNumber: string) => {
  router.push({ path: "/transactions", query: { account: accountNumber } });
};

onMounted(fetchBalance);
</script>

<style scoped>
.dashboard {
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

/* ─── Hero Balance ─────────────────────────── */

.balance-hero {
  padding: 36px 40px;
  border-radius: 20px;
  margin-bottom: 32px;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.12), rgba(103, 194, 58, 0.08)),
    rgba(26, 35, 50, 0.8);
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.balance-label {
  font-size: 14px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.currency {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-secondary);
}

.amount {
  font-size: 44px;
  font-weight: 800;
  background: linear-gradient(135deg, #e8eaf0, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.balance-currency {
  color: var(--text-muted);
  font-size: 13px;
}

/* ─── Section Header ───────────────────────── */

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
}

/* ─── Account Cards ────────────────────────── */

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.account-card {
  cursor: default;
}

.account-card :deep(.el-card__body) {
  padding: 24px;
}

.acct-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.acct-icon {
  font-size: 32px;
}

.acct-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.acct-number {
  font-size: 14px;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
  margin-bottom: 20px;
}

.acct-balance {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
  margin-bottom: 8px;
}

.acct-balance-label {
  font-size: 13px;
  color: var(--text-muted);
}

.acct-balance-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--success);
}

.acct-action {
  width: 100%;
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 24px;
  }
  
  .balance-hero {
    padding: 24px;
    border-radius: 16px;
  }
  
  .balance-amount {
    font-size: 32px;
  }
  
  .accounts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
