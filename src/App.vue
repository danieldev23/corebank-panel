<template>
  <div class="app-root" :class="{ dark: isDark }">
    <!-- Login page: full screen, no sidebar -->
    <template v-if="isLoginPage">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </template>

    <!-- Main layout with sidebar -->
    <template v-else>
      <aside class="sidebar glass" :class="{ 'sidebar-open': mobileMenuOpen }">
        <div class="sidebar-brand">
          <div class="brand-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <h1 class="brand-title">MBBank Panel</h1>
          <span class="brand-badge">PRO</span>
        </div>

        <el-menu
          :default-active="currentRoute"
          :router="true"
          class="sidebar-menu"
          background-color="transparent"
          text-color="#8b95a5"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataBoard /></el-icon>
            <span>{{ $t('nav.dashboard') }}</span>
          </el-menu-item>
          <el-menu-item index="/transactions">
            <el-icon><List /></el-icon>
            <span>{{ $t('nav.transactions') }}</span>
          </el-menu-item>
          <el-menu-item index="/api-docs">
            <el-icon><Document /></el-icon>
            <span>{{ $t('nav.apiDocs') }}</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>{{ $t('nav.settings') }}</span>
          </el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
          <div class="session-info" v-if="sessionActive">
            <div class="session-dot pulse-glow"></div>
            <span>{{ $t('nav.sessionActive') }}</span>
          </div>

          <div class="developer-credits">
            Developed by <strong><a href="https://facebook.com/dangquochuy.dev" target="_blank" style="color: var(--text-primary); text-decoration: none;">Dang Quoc Huy</a></strong> with ❤️
          </div>
          
          <div class="sidebar-actions">
            <el-button text size="small" @click="toggleLocale" style="font-weight: bold; width: 40px;">
              {{ currentLocale.toUpperCase() }}
            </el-button>
            <el-button text size="small" @click="toggleTheme">
              <el-icon><component :is="isDark ? Sunny : Moon" /></el-icon>
            </el-button>
            <el-button
              type="danger"
              text
              size="small"
              @click="logout"
            >
              <el-icon style="margin-right: 4px"><SwitchButton /></el-icon>
              {{ $t('nav.logout') }}
            </el-button>
          </div>
        </div>
      </aside>

      <!-- Mobile Header Overlay -->
      <div class="mobile-header">
        <el-button text class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
          <el-icon :size="24"><Expand v-if="!mobileMenuOpen"/><Fold v-else/></el-icon>
        </el-button>
        <span class="mobile-title">MB Panel PRO</span>
      </div>

      <!-- Mobile Backdrop -->
      <div v-if="mobileMenuOpen" class="mobile-backdrop" @click="mobileMenuOpen = false"></div>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  DataBoard,
  List,
  Document,
  SwitchButton,
  Monitor,
  Expand,
  Fold,
  Sunny,
  Moon,
  Setting,
} from "@element-plus/icons-vue";
import api from "./api";

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const sessionActive = ref(false);
const mobileMenuOpen = ref(false);

const isLoginPage = computed(() => route.path === "/login" || route.path === "/");
const currentRoute = computed(() => route.path);
const currentLocale = computed(() => locale.value);

const isDark = ref(localStorage.getItem('theme') !== 'light');

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  document.documentElement.className = isDark.value ? 'dark' : '';
};

const toggleLocale = () => {
  locale.value = locale.value === 'vi' ? 'en' : 'vi';
  localStorage.setItem('locale', locale.value);
};

const checkSession = async () => {
  try {
    const { data } = await api.get("/status");
    sessionActive.value = data.loggedIn;
    if (data.loggedIn) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
      if (route.path !== '/login' && route.path !== '/') router.push('/login');
    }
  } catch {
    sessionActive.value = false;
    localStorage.removeItem('isAuthenticated');
    if (route.path !== '/login' && route.path !== '/') router.push('/login');
  }
};

const logout = () => {
  sessionActive.value = false;
  localStorage.removeItem('isAuthenticated');
  router.push("/login");
};

onMounted(() => {
  checkSession();
  document.documentElement.className = isDark.value ? 'dark' : '';
});
</script>

<style scoped>
.app-root {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ─── Sidebar ──────────────────────────────────── */

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  border-right: 1px solid var(--border-color);
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px 28px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.brand-icon {
  font-size: 28px;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #409eff, #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  line-height: 1.2;
}

.brand-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  background: linear-gradient(135deg, #409eff, #2563eb);
  border-radius: 20px;
  color: white;
  letter-spacing: 1px;
}

.sidebar-menu {
  flex: 1;
  padding: 0 8px;
}

.sidebar-menu .el-menu-item {
  border-radius: var(--radius-sm);
  margin: 4px 0;
  height: 48px;
  transition: var(--transition);
}

.sidebar-menu .el-menu-item:hover {
  background: var(--accent-glow) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background: var(--accent-glow) !important;
  color: var(--accent) !important;
  font-weight: 600;
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.developer-credits {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
  margin-bottom: 16px;
  text-align: center;
}

.developer-credits strong {
  color: var(--text-primary);
  font-weight: 600;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}


.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--success);
}

.session-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

/* ─── Main Content ─────────────────────────────── */

.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 32px 40px;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(64, 158, 255, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(103, 194, 58, 0.04) 0%, transparent 60%),
    var(--bg-primary);
}

/* ─── Mobile View ──────────────────────────────── */

.mobile-header {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
}

.mobile-menu-btn {
  padding: 8px;
  color: var(--text-primary);
}

.mobile-title {
  font-weight: 700;
  font-size: 16px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 45;
  backdrop-filter: blur(4px);
}

@media (max-width: 768px) {
  .app-root {
    flex-direction: column;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .mobile-header {
    display: flex;
  }

  .mobile-backdrop {
    display: block;
  }

  .main-content {
    padding: 80px 16px 24px;
    width: 100vw;
  }
}
</style>
