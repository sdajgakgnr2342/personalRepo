<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['search', 'refresh', 'toggle-sidebar'])

defineProps({
  showMenuButton: { type: Boolean, default: false },
})
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showUserMenu = ref(false)

async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  emit('search', searchKeyword.value.trim())
}

async function handleLogout() {
  await userStore.logout()
  router.push('/login')
}

function goAbout() {
  router.push('/about')
}

function goHelp() {
  router.push('/help')
}

function handleRefresh() {
  emit('refresh')
}

function closeMenus() {
  showUserMenu.value = false
}

function onDocumentClick() {
  closeMenus()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        v-if="showMenuButton"
        type="button"
        class="icon-btn menu-btn icon-only"
        title="菜单"
        @click="emit('toggle-sidebar')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" stroke="#2563eb" stroke-width="2"/>
          <line x1="8" y1="7" x2="16" y2="7" stroke="#2563eb" stroke-width="1.5"/>
          <line x1="8" y1="11" x2="16" y2="11" stroke="#2563eb" stroke-width="1.5"/>
        </svg>
        myNotebook
      </span>
    </div>

    <div class="search-box">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#9ca3af" stroke-width="2"/>
        <line x1="16" y1="16" x2="21" y2="21" stroke="#9ca3af" stroke-width="2"/>
      </svg>
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索笔记标题/内容..."
        @keyup.enter="handleSearch"
      />
    </div>

    <div class="topbar-right">
      <button type="button" class="icon-btn icon-only" title="刷新" @click="handleRefresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="refresh-icon">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button type="button" class="icon-btn" title="帮助" @click="goHelp">
        <span class="help-icon">?</span><span class="btn-label"> 帮助</span>
      </button>
      <button type="button" class="icon-btn" title="关于" @click="goAbout">
        <span>ℹ️</span><span class="btn-label"> 关于</span>
      </button>
      <div class="user-dropdown" @click.stop>
        <button type="button" class="icon-btn user-btn" @click="showUserMenu = !showUserMenu">
          <span>👤</span><span class="btn-label"> 用户中心</span>
        </button>
        <div v-if="showUserMenu" class="dropdown-menu user-menu">
          <div class="user-info">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</div>
          <button type="button" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 52px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.search-box {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.search-box input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.search-box input:focus {
  border-color: #2563eb;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: none;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
}

.icon-btn:hover {
  background: #f1f5f9;
}

.icon-btn.icon-only {
  padding: 6px 8px;
}

.refresh-icon {
  display: block;
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.user-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 140px;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
}

.dropdown-menu button:hover {
  background: #f3f4f6;
}

.user-info {
  padding: 10px 16px;
  font-size: 13px;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9;
}

@media (max-width: 768px) {
  .topbar {
    gap: 8px;
    padding: 0 12px;
  }

  .logo {
    font-size: 15px;
  }

  .search-box {
    max-width: none;
    min-width: 0;
  }

  .btn-label {
    display: none;
  }
}
</style>
