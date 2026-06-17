<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const emit = defineEmits(['search', 'refresh', 'toggle-sidebar'])

const props = defineProps({
  showMenuButton: { type: Boolean, default: false },
})

const router = useRouter()

const searchKeyword = ref('')
const searchExpanded = ref(false)
const searchInputRef = ref(null)

async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  emit('search', searchKeyword.value.trim())
  if (props.showMenuButton) {
    closeSearch()
  }
}

async function openSearch() {
  searchExpanded.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

function closeSearch() {
  searchExpanded.value = false
}

function goUserCenter() {
  router.push('/user')
}

function handleRefresh() {
  emit('refresh')
}

function onDocumentClick() {
  if (props.showMenuButton && searchExpanded.value) {
    closeSearch()
  }
}

function onDocumentKeydown(e) {
  if (e.key === 'Escape' && searchExpanded.value) {
    closeSearch()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <header class="topbar" :class="{ 'search-open': showMenuButton && searchExpanded }">
    <div class="topbar-left">
      <button
        v-if="showMenuButton"
        type="button"
        class="icon-btn menu-btn icon-only"
        title="菜单"
        @click="emit('toggle-sidebar')"
      >
        <AppIcon name="menu" :size="18" alt="菜单" />
      </button>
      <span v-if="!(showMenuButton && searchExpanded)" class="logo">
        <AppIcon name="logo" :size="20" alt="myNotebook" />
        myNotebook
      </span>
    </div>

    <!-- 桌面端：常驻搜索框 -->
    <div v-if="!showMenuButton" class="search-box">
      <AppIcon name="search" :size="16" class="search-icon" alt="搜索" />
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索笔记标题/内容..."
        @keyup.enter="handleSearch"
      />
    </div>

    <!-- 移动端：点击图标后展开 -->
    <div
      v-if="showMenuButton && searchExpanded"
      class="search-box mobile-search"
      @click.stop
    >
      <AppIcon name="search" :size="16" class="search-icon" alt="搜索" />
      <input
        ref="searchInputRef"
        v-model="searchKeyword"
        type="text"
        placeholder="搜索笔记标题/内容..."
        @keyup.enter="handleSearch"
      />
      <button type="button" class="search-close" title="关闭搜索" @click="closeSearch">
        <AppIcon name="close" :size="16" alt="关闭" />
      </button>
    </div>

    <div v-if="!(showMenuButton && searchExpanded)" class="topbar-right">
      <button
        v-if="showMenuButton"
        type="button"
        class="icon-btn icon-only"
        title="搜索"
        @click.stop="openSearch"
      >
        <AppIcon name="search" :size="18" alt="搜索" />
      </button>
      <button type="button" class="icon-btn icon-only" title="刷新" @click="handleRefresh">
        <AppIcon name="refresh" :size="16" alt="刷新" />
      </button>
      <div class="user-dropdown" @click.stop>
        <button
          type="button"
          class="icon-btn user-btn"
          :class="{ 'icon-only': showMenuButton }"
          title="用户中心"
          @click="goUserCenter"
        >
          <AppIcon name="user" :size="showMenuButton ? 22 : 18" alt="用户中心" /><span class="btn-label"> 用户中心</span>
        </button>
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

.topbar.search-open {
  gap: 8px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
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

.mobile-search {
  flex: 1;
  max-width: none;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
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

.mobile-search input {
  padding-right: 40px;
}

.search-box input:focus {
  border-color: #2563eb;
}

.search-close {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.search-close:hover {
  background: #f1f5f9;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
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

.user-dropdown {
  position: relative;
}

@media (max-width: 768px) {
  .topbar {
    gap: 8px;
    padding: 0 12px;
  }

  .logo {
    font-size: 15px;
  }

  .btn-label {
    display: none;
  }
}
</style>
