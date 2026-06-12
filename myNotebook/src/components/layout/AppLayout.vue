<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const appTitle = import.meta.env.VITE_APP_TITLE || 'myNotebook'

const isLoggedIn = computed(() => !!userStore.token)

async function handleLogout() {
  await userStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <RouterLink to="/" class="logo">{{ appTitle }}</RouterLink>

      <div class="header-right">
        <nav class="nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/about">关于</RouterLink>
        </nav>

        <div class="auth">
          <template v-if="isLoggedIn">
            <RouterLink to="/create-note" class="auth-link">创建笔记</RouterLink>
            <button type="button" class="logout-btn" @click="handleLogout">退出</button>
          </template>
          <RouterLink v-else to="/login" class="login-btn">登录</RouterLink>
        </div>
      </div>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="footer">
      <span>Vue 3 + Vite 前后端分离脚手架</span>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a,
.auth-link {
  color: var(--text);
  text-decoration: none;
  transition: color 0.2s;
}

.nav a:hover,
.nav a.router-link-exact-active,
.auth-link:hover,
.auth-link.router-link-exact-active {
  color: var(--accent);
}

.auth {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-btn {
  padding: 6px 16px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  transition: opacity 0.2s;
}

.login-btn:hover {
  opacity: 0.85;
  color: #fff;
}

.logout-btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.logout-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.main {
  flex: 1;
  padding: 32px 24px;
}

.footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 14px;
  color: var(--text);
}
</style>
