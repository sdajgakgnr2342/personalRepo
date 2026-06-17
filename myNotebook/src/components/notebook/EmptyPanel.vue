<script setup>
import { computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import EmptyState from '@/components/EmptyState.vue'

const notebookStore = useNotebookStore()

const panel = computed(() => {
  const mode = notebookStore.sidebarMode

  if (mode === 'drafts') {
    if (!notebookStore.drafts.length) {
      return {
        title: '暂无草稿',
        description: '草稿箱是空的',
        hint: '编写笔记时可保存为草稿，会出现在这里',
      }
    }
    return {
      title: '草稿箱',
      description: `共 ${notebookStore.drafts.length} 篇草稿`,
      hint: '请从左侧列表选择一篇草稿进行编辑',
    }
  }

  if (mode === 'favorites') {
    if (!notebookStore.favorites.length) {
      return {
        title: '暂无收藏',
        description: '还没有收藏任何笔记',
        hint: '打开笔记后可将其加入收藏夹',
      }
    }
    return {
      title: '收藏夹',
      description: `共 ${notebookStore.favorites.length} 篇收藏`,
      hint: '请从左侧列表选择一篇笔记查看',
    }
  }

  if (mode === 'trash') {
    if (!notebookStore.trash.length) {
      return {
        title: '垃圾箱为空',
        description: '删除的内容会暂存在这里',
        hint: '删除笔记或文件夹后，可在此恢复',
      }
    }
    return {
      title: '垃圾箱',
      description: `共 ${notebookStore.trash.length} 项`,
      hint: '请从左侧列表选择一项，在右侧恢复或永久删除',
    }
  }

  return {
    title: '请选择内容',
    description: '从左侧菜单开始浏览',
    hint: '',
  }
})
</script>

<template>
  <div class="empty-panel">
    <EmptyState
      fill
      size="lg"
      :title="panel.title"
      :description="panel.description"
      :hint="panel.hint"
    />
  </div>
</template>

<style scoped>
.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}
</style>
