<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotebookStore } from '@/stores/notebook'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getContentTypeIcon } from '@/utils/icons'

const emit = defineEmits(['select-item', 'select-trash-item', 'show-stats', 'switch-mode', 'close-mobile'])

const props = defineProps({
  mobileOpen: { type: Boolean, default: false },
})

const notebookStore = useNotebookStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(localStorage.getItem('sidebarCollapsed') === '1')

watch(collapsed, (val) => {
  localStorage.setItem('sidebarCollapsed', val ? '1' : '0')
})

function handleCollapseClick() {
  if (props.mobileOpen) {
    emit('close-mobile')
    return
  }
  collapsed.value = !collapsed.value
}

function switchMode(mode) {
  emit('switch-mode', mode)
  if (collapsed.value && mode !== 'stats') {
    collapsed.value = false
  }
}

function handleShowStats() {
  emit('show-stats')
}

function goHelp() {
  emit('close-mobile')
  router.push('/help')
}

function goAbout() {
  emit('close-mobile')
  router.push('/about')
}

function goUserCenter() {
  emit('close-mobile')
  router.push('/user')
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <button
      type="button"
      class="collapse-btn"
      :title="mobileOpen ? '关闭菜单' : (collapsed ? '展开菜单' : '收起菜单')"
      @click="handleCollapseClick"
    >
      <AppIcon
        :name="mobileOpen ? 'close' : (collapsed ? 'sidebar-collapse' : 'sidebar-expand')"
        :size="16"
        alt=""
      />
      <span v-if="mobileOpen" class="collapse-label">关闭</span>
      <span v-else v-show="!collapsed" class="collapse-label">收起</span>
    </button>

    <div class="sidebar-inner">
      <section class="nav-section">
        <div
          class="nav-item home-menu"
          :class="{ active: notebookStore.sidebarMode === 'stats' }"
          title="首页"
          @click="handleShowStats"
        >
          <AppIcon name="home" :size="20" alt="首页" class="nav-icon" />
          <span v-show="!collapsed" class="nav-label">首页</span>
        </div>
      </section>

      <section class="nav-section shortcuts">
        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'tree' }"
          title="我的笔记"
          @click="switchMode('tree')"
        >
          <AppIcon name="my-notes" :size="20" alt="我的笔记" class="nav-icon" />
          <span v-show="!collapsed" class="nav-label">我的笔记</span>
        </div>

        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'drafts' }"
          title="草稿箱"
          @click="switchMode('drafts')"
        >
          <span class="nav-icon-wrap">
            <AppIcon name="drafts" :size="20" alt="草稿箱" class="nav-icon" />
            <span
              v-if="collapsed && notebookStore.stats.draftCount"
              class="icon-badge"
            >{{ notebookStore.stats.draftCount > 9 ? '9+' : notebookStore.stats.draftCount }}</span>
          </span>
          <span v-show="!collapsed" class="nav-label">草稿箱</span>
          <span v-if="!collapsed" class="badge">{{ notebookStore.stats.draftCount || 0 }}</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'drafts'">
          <div
            v-for="item in notebookStore.drafts"
            :key="item.id"
            class="sub-item"
            @click="emit('select-item', item.id)"
          >
            {{ item.name }}
          </div>
          <EmptyState
            v-if="!notebookStore.drafts.length"
            size="sm"
            title="暂无草稿"
          />
        </template>

        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'favorites' }"
          title="收藏夹"
          @click="switchMode('favorites')"
        >
          <AppIcon name="favorites" :size="20" alt="收藏夹" class="nav-icon" />
          <span v-show="!collapsed" class="nav-label">收藏夹</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'favorites'">
          <div
            v-for="item in notebookStore.favorites"
            :key="item.id"
            class="sub-item"
            @click="emit('select-item', item.id)"
          >
            {{ item.name }}
          </div>
          <EmptyState
            v-if="!notebookStore.favorites.length"
            size="sm"
            title="暂无收藏"
          />
        </template>

        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'trash' }"
          title="垃圾箱"
          @click="switchMode('trash')"
        >
          <AppIcon name="trash" :size="20" alt="垃圾箱" class="nav-icon" />
          <span v-show="!collapsed" class="nav-label">垃圾箱</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'trash'">
          <div
            v-for="item in notebookStore.trash"
            :key="item.id"
            class="sub-item trash-item"
            :class="{ active: notebookStore.trashSelectedItem?.id === item.id }"
            @click="emit('select-trash-item', item)"
          >
            <AppIcon :name="getContentTypeIcon(item.itemType)" :size="14" alt="" class="trash-item-icon" />
            {{ item.name }}
          </div>
          <EmptyState
            v-if="!notebookStore.trash.length"
            size="sm"
            title="垃圾箱为空"
          />
        </template>
      </section>
    </div>

    <section class="nav-section nav-footer">
      <div
        class="nav-item"
        :class="{ active: route.path.startsWith('/user') }"
        title="用户中心"
        @click="goUserCenter"
      >
        <AppIcon name="user" :size="20" alt="用户中心" class="nav-icon" />
        <span v-show="!collapsed" class="nav-label">用户中心</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: route.path === '/help' }"
        title="帮助"
        @click="goHelp"
      >
        <AppIcon name="help" :size="20" alt="帮助" class="nav-icon" />
        <span v-show="!collapsed" class="nav-label">帮助</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: route.path === '/about' }"
        title="关于"
        @click="goAbout"
      >
        <AppIcon name="about" :size="20" alt="关于" class="nav-icon" />
        <span v-show="!collapsed" class="nav-label">关于</span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-width: 240px;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.22s ease, min-width 0.22s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 52px;
    bottom: 0;
    z-index: 200;
    width: 260px;
    min-width: 260px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: none;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
  }

  .sidebar.collapsed {
    width: 260px;
    min-width: 260px;
  }
}

.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section {
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
}

.nav-section:last-child {
  border-bottom: none;
}

.home-menu {
  margin-top: 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 8px;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.shortcuts .nav-item {
  justify-content: space-between;
}

.sidebar.collapsed .shortcuts .nav-item {
  justify-content: center;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-icon-wrap {
  position: relative;
  flex-shrink: 0;
  width: 22px;
  display: flex;
  justify-content: center;
}

.icon-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  border-radius: 7px;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  background: #e5e7eb;
  color: #64748b;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.sub-item {
  padding: 6px 16px 6px 32px;
  font-size: 13px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-item:hover,
.sub-item.active {
  background: #f3f4f6;
}

.sub-item.active {
  color: #2563eb;
  font-weight: 500;
}

.trash-item-icon {
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: #f1f5f9;
  color: #2563eb;
}

.sidebar.collapsed .collapse-btn {
  padding: 12px 8px;
}

.collapse-label {
  white-space: nowrap;
}

.nav-footer {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: none;
  margin-top: auto;
}
</style>
