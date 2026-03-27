<template>
  <div class="transactions">
    <div class="page-header">
      <h1>{{ $t('transactions.title') }}</h1>
    </div>

    <div class="top-row">
      <!-- Filters -->
      <el-card class="filter-card">
        <div class="filters">
          <div class="filter-item">
            <label>{{ $t('transactions.accountNumber') }}</label>
            <el-input
              v-model="filters.accountNumber"
              placeholder=""
              size="large"
            />
          </div>
          <div class="filter-item">
            <label>{{ $t('transactions.fromDate') }}</label>
            <el-date-picker
              v-model="filters.fromDate"
              type="date"
              placeholder=""
              format="DD/MM/YYYY"
              value-format="DD/MM/YYYY"
              size="large"
              style="width: 100%"
            />
          </div>
          <div class="filter-item">
            <label>{{ $t('transactions.toDate') }}</label>
            <el-date-picker
              v-model="filters.toDate"
              type="date"
              placeholder=""
              format="DD/MM/YYYY"
              value-format="DD/MM/YYYY"
              size="large"
              style="width: 100%"
            />
          </div>
          <div class="filter-item filter-action">
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              :icon="Search"
              @click="fetchTransactions"
            >
              {{ $t('transactions.search') }}
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- VietQR -->
      <el-card class="qr-card" v-if="filters.accountNumber" :body-style="{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
        <div class="qr-container">
          <img 
            :src="`https://img.vietqr.io/image/mb-${filters.accountNumber}-compact2.png`" 
            alt="VietQR" 
            class="vietqr-img"
          />
        </div>
      </el-card>
    </div>

    <div v-if="loading && !transactions.length" class="loading-state">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else-if="transactions.length">
      <!-- Summary -->
      <div class="summary-row">
        <div class="summary-item glass">
          <span class="summary-label">{{ $t('transactions.totalTx') }}</span>
          <span class="summary-value">{{ transactions.length }}</span>
        </div>
        <div class="summary-item glass">
          <span class="summary-label">{{ $t('transactions.totalCredit') }}</span>
          <span class="summary-value credit">+{{ formatMoney(totalCredit) }} ₫</span>
        </div>
        <div class="summary-item glass">
          <span class="summary-label">{{ $t('transactions.totalDebit') }}</span>
          <span class="summary-value debit">-{{ formatMoney(totalDebit) }} ₫</span>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">{{ $t('transactions.incomeVsExpense') }}</div>
          </template>
          <v-chart class="chart" :option="pieOptions" autoresize />
        </el-card>

        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">{{ $t('transactions.cashFlow') }}</div>
          </template>
          <v-chart class="chart" :option="barOptions" autoresize />
        </el-card>
      </div>

      <!-- Table -->
      <el-card class="table-card">
        <template #header>
          <div class="chart-header">{{ $t('transactions.txHistory') }}</div>
        </template>
        <el-table :data="transactions" stripe style="width: 100%" max-height="600">
          <el-table-column prop="transactionDate" :label="$t('transactions.date')" width="120" />
          <el-table-column :label="$t('transactions.type')" width="90">
            <template #default="{ row }">
              <el-tag
                :type="row.creditAmount > 0 ? 'success' : 'danger'"
                size="small"
                effect="dark"
                round
              >
                {{ row.creditAmount > 0 ? "IN" : "OUT" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('transactions.amount')" width="160">
            <template #default="{ row }">
              <span :class="row.creditAmount > 0 ? 'credit' : 'debit'" class="amount-cell">
                {{ row.creditAmount > 0 ? "+" : "-" }}{{ formatMoney(row.creditAmount || row.debitAmount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="description" :label="$t('transactions.description')" min-width="250" show-overflow-tooltip />
          <el-table-column :label="$t('transactions.beneficiary')" min-width="180">
            <template #default="{ row }">
              <div v-if="row.beneficiaryName">
                <div class="font-medium">{{ row.beneficiaryName }}</div>
                <div class="text-muted text-sm">{{ row.beneficiaryBank }}</div>
              </div>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="refNo" :label="$t('transactions.ref')" width="140" show-overflow-tooltip />
        </el-table>
      </el-card>
    </template>

    <el-empty
      v-else-if="!loading && searched"
      :description="$t('transactions.noTx')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import api from "../api";

// ECharts
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart, BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import VChart from "vue-echarts";

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

// ─── Interfaces & State ─────────────────────────────────────────────────

interface Transaction {
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
}

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const searched = ref(false);
const transactions = ref<Transaction[]>([]);

// Default dates
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const filters = reactive({
  accountNumber: (route.query.account as string) || "",
  fromDate: formatDate(thirtyDaysAgo),
  toDate: formatDate(now),
});

// ─── Computed Stats ─────────────────────────────────────────────────────

const formatMoney = (val: number | string): string => {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0";
  return n.toLocaleString("vi-VN");
};

const totalCredit = computed(() =>
  transactions.value.reduce((sum, t) => sum + (Number(t.creditAmount) || 0), 0)
);

const totalDebit = computed(() =>
  transactions.value.reduce((sum, t) => sum + (Number(t.debitAmount) || 0), 0)
);

// ─── Charts Options ───────────────────────────────────────────────────────

const pieOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ₫ ({d}%)' },
  legend: { bottom: '0%', textStyle: { color: '#a3a8b8' } },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#1a2332',
        borderWidth: 2
      },
      label: { show: false },
      data: [
        { value: totalCredit.value, name: 'Income', itemStyle: { color: '#67c23a' } },
        { value: totalDebit.value, name: 'Expense', itemStyle: { color: '#f56c6c' } }
      ]
    }
  ]
}));

const barOptions = computed(() => {
  // Aggregate daily
  const daily: Record<string, { in: number, out: number }> = {};
  [...transactions.value].reverse().forEach(t => {
    // Extract date part only (dd/mm/yyyy) from transactionDate which might have time
    const d = t.transactionDate.split(' ')[0];
    if (!daily[d]) daily[d] = { in: 0, out: 0 };
    daily[d].in += Number(t.creditAmount) || 0;
    daily[d].out += Number(t.debitAmount) || 0;
  });

  const dates = Object.keys(daily);
  const inData = dates.map(d => daily[d].in);
  const outData = dates.map(d => daily[d].out);

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Income', 'Expense'], textStyle: { color: '#a3a8b8' }, bottom: '0%' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8b95a5' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a3441' } }, axisLabel: { color: '#8b95a5', formatter: (v: number) => v >= 1000000 ? (v/1000000)+'M' : v >= 1000 ? (v/1000)+'k' : v } },
    series: [
      { name: 'Income', type: 'bar', stack: 'total', itemStyle: { color: '#67c23a', borderRadius: [0,0,4,4] }, data: inData },
      { name: 'Expense', type: 'bar', stack: 'total', itemStyle: { color: '#f56c6c', borderRadius: [4,4,0,0] }, data: outData }
    ]
  };
});

// ─── API Initial Fetch ────────────────────────────────────────────────────

const fetchTransactions = async () => {
  if (!filters.accountNumber) {
    ElMessage.warning("Please enter account number");
    return;
  }

  loading.value = true;
  searched.value = true;
  try {
    const { data } = await api.post("/transactions", {
      accountNumber: filters.accountNumber,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });

    if (data.success) {
      // Sort by latest first
      transactions.value = (data.data || []).sort(() => {
        // Basic sort: reverse array assuming API returns older to newer
        return -1;
      });
      // The API typically returns newest first, so we just assign
      transactions.value = data.data || [];
    } else {
      ElMessage.error(data.message || "Failed to fetch transactions");
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    if (msg.includes("Not logged in") || msg.includes("Session expired")) {
      ElMessage.warning("Please login first");
      localStorage.removeItem('isAuthenticated');
      router.push("/login");
    } else {
      ElMessage.error(msg);
    }
  } finally {
    loading.value = false;
  }
};

const initData = async () => {
  // If account is already given in URL query
  if (filters.accountNumber) {
    fetchTransactions();
    return;
  }

  // Auto-fetch balance to get the primary account number
  loading.value = true;
  try {
    const { data } = await api.post("/balance");
    if (data.success && data.data?.accounts?.length > 0) {
      filters.accountNumber = data.data.accounts[0].number;
      fetchTransactions();
    } else {
      loading.value = false;
    }
  } catch {
    loading.value = false;
  }
};

onMounted(initData);
</script>

<style scoped>
.transactions {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.top-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.filter-card {
  flex: 1;
}

.qr-card {
  width: 250px;
  flex-shrink: 0;
}

/* ─── Filters ──────────────────────────────── */

.filter-card :deep(.el-card__body) {
  padding: 24px;
}

.filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;
}

.filter-item label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.filter-action {
  padding-top: 22px;
}

/* ─── VietQR ───────────────────────────────── */

.qr-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 8px;
}

.vietqr-img {
  max-width: 100%;
  object-fit: contain;
}

/* ─── Summary ──────────────────────────────── */

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-item {
  padding: 20px 24px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
}

/* ─── Charts ───────────────────────────────── */

.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-header {
  font-weight: 600;
  font-size: 15px;
}

.chart-card :deep(.el-card__body) {
  padding: 16px;
}

.chart {
  height: 300px;
  width: 100%;
}

/* ─── Table ────────────────────────────────── */

.table-card :deep(.el-card__body) {
  padding: 0;
}

.amount-cell {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.credit {
  color: var(--credit);
}

.debit {
  color: var(--debit);
}

.text-muted {
  color: var(--text-muted);
}

.text-sm {
  font-size: 12px;
}

.font-medium {
  font-weight: 500;
}

.loading-state {
  padding: 40px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

@media (max-width: 900px) {
  .top-row {
    flex-direction: column-reverse;
  }
  .qr-card {
    width: 100%;
  }
  .filters {
    grid-template-columns: 1fr 1fr;
  }
  .charts-row {
    grid-template-columns: 1fr;
  }
  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
