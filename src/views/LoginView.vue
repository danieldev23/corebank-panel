<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-orb bg-orb-1"></div>
      <div class="bg-orb bg-orb-2"></div>
      <div class="bg-orb bg-orb-3"></div>
    </div>

    <div class="login-container glass">
      <div class="login-header">
        <div class="logo">
          <el-icon>
            <Monitor />
          </el-icon>
        </div>
        <h1>{{ $t('login.title') }}</h1>
        <p class="subtitle">{{ $t('login.desc') }}</p>
      </div>

      <el-form :model="form" label-position="top" class="login-form" @submit.prevent="handleLogin">
        <el-form-item :label="$t('login.phone')">
          <el-input v-model="form.username" :placeholder="$t('login.phone')" :prefix-icon="User" size="large" />
        </el-form-item>

        <el-form-item :label="$t('login.password')">
          <el-input v-model="form.password" type="password" :placeholder="$t('login.password')" :prefix-icon="Lock"
            size="large" show-password />
        </el-form-item>

        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin"
          native-type="submit">
          <template v-if="loading">
            <span>{{ statusText }}</span>
          </template>
          <template v-else>
            <el-icon>
              <Key />
            </el-icon>
            <span>{{ $t('login.loginBtn') }}</span>
          </template>
        </el-button>
      </el-form>

      <!-- Login progress -->
      <div v-if="loading" class="login-progress">
        <el-progress :percentage="progress" :stroke-width="4" :show-text="false" status="success" />
        <span class="progress-text">{{ statusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Lock, Key, Monitor } from "@element-plus/icons-vue";
import api from "../api";

const router = useRouter();
const loading = ref(false);
const progress = ref(0);
const statusText = ref("");

const form = reactive({
  username: "",
  password: "",
});

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning("Please fill in all fields");
    return;
  }

  loading.value = true;
  progress.value = 10;
  statusText.value = "🔐 Connecting to Core Bank...";

  try {
    // Simulate progress while auto-login runs
    const progressInterval = setInterval(() => {
      if (progress.value < 85) {
        progress.value += Math.random() * 15;
        const msgs = [
          "📥 Fetching captcha...",
          "🤖 Solving captcha with OCR...",
          "🔑 Encrypting credentials...",
          "📡 Authenticating...",
        ];
        statusText.value = msgs[Math.floor(Math.random() * msgs.length)];
      }
    }, 800);

    const { data } = await api.post("/login", {
      username: form.username,
      password: form.password,
    });

    clearInterval(progressInterval);

    if (data.success) {
      localStorage.setItem('isAuthenticated', 'true');
      progress.value = 100;
      statusText.value = "✅ Login successful!";
      ElMessage.success(
        `Login successful! (${data.attempts} attempt${data.attempts > 1 ? "s" : ""})`
      );
      setTimeout(() => router.push("/dashboard"), 500);
    } else {
      progress.value = 0;
      ElMessage.error(data.message || "Login failed");
    }
  } catch (err: any) {
    progress.value = 0;
    ElMessage.error(err.response?.data?.message || "Login failed");
  } finally {
    loading.value = false;
  }
};


</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.bg-orb-1 {
  width: 500px;
  height: 500px;
  background: #409eff;
  top: -150px;
  left: -100px;
  animation: float 8s ease-in-out infinite;
}

.bg-orb-2 {
  width: 400px;
  height: 400px;
  background: #67c23a;
  bottom: -100px;
  right: -80px;
  animation: float 10s ease-in-out infinite reverse;
}

.bg-orb-3 {
  width: 300px;
  height: 300px;
  background: #e6a23c;
  top: 50%;
  left: 60%;
  animation: float 12s ease-in-out infinite;
}

@keyframes float {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -20px) scale(1.05);
  }

  66% {
    transform: translate(-20px, 15px) scale(0.95);
  }
}

.login-container {
  width: 420px;
  max-width: 90%;
  padding: 40px;
  border-radius: 20px;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo {
  font-size: 56px;
  color: var(--accent);
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 14px;
}

.login-form :deep(.el-form-item__label) {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-progress {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.login-footer .el-button {
  color: var(--text-muted) !important;
}

.login-footer .el-button:hover {
  color: var(--accent) !important;
}
</style>
