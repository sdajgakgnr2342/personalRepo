<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  title: { type: String, default: '在此目录下新建' },
})

const emit = defineEmits(['create-folder', 'create-note'])
const showMenu = ref(false)

function toggleMenu(e) {
  e.stopPropagation()
  showMenu.value = !showMenu.value
}

function choose(type, e) {
  e.stopPropagation()
  showMenu.value = false
  emit(type === 'folder' ? 'create-folder' : 'create-note')
}

function closeMenu() {
  showMenu.value = false
}

onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))
</script>

<template>
  <div class="add-menu-wrap" @click.stop>
    <button type="button" class="add-btn" :class="{ visible: showMenu }" title="新建" @click="toggleMenu">
      <AppIcon name="add" :size="14" alt="新建" />
    </button>
    <div v-if="showMenu" class="add-menu">
      <button type="button" @click="choose('folder', $event)">
        <AppIcon name="folder" :size="16" alt="" /> 新建文件夹
      </button>
      <button type="button" @click="choose('note', $event)">
        <AppIcon name="note" :size="16" alt="" /> 新建笔记
      </button>
    </div>
  </div>
</template>

<style scoped>
.add-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.add-btn:hover {
  background: #eff6ff;
  border-color: #2563eb;
}

.add-btn.visible,
.add-menu-wrap:hover .add-btn {
  opacity: 1;
}

.add-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 130px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
}

.add-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
}

.add-menu button:hover {
  background: #f3f4f6;
}
</style>
