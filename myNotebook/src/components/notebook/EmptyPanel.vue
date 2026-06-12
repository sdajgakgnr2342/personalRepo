<script setup>
import { computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'

const notebookStore = useNotebookStore()

const panel = computed(() => {
  const mode = notebookStore.sidebarMode

  if (mode === 'tree') {
    if (!notebookStore.getTreeNodes().length) {
      return {
        icon: '📂',
        title: '暂无笔记',
        desc: '还没有任何笔记或文件夹',
        hint: '点击左侧「我的笔记」旁的 + 按钮，或右键选择新建',
      }
    }
    return {
      icon: '📂',
      title: '我的笔记',
      desc: '请从左侧选择一篇笔记或文件夹',
      hint: '也可悬停文件夹，点击 + 在此目录下新建',
    }
  }

  if (mode === 'drafts') {
    if (!notebookStore.drafts.length) {
      return {
        icon: '📝',
        title: '暂无草稿',
        desc: '草稿箱是空的',
        hint: '编写笔记时可保存为草稿，会出现在这里',
      }
    }
    return {
      icon: '📝',
      title: '草稿箱',
      desc: `共 ${notebookStore.drafts.length} 篇草稿`,
      hint: '请从左侧列表选择一篇草稿进行编辑',
    }
  }

  if (mode === 'favorites') {
    if (!notebookStore.favorites.length) {
      return {
        icon: '⭐',
        title: '暂无收藏',
        desc: '还没有收藏任何笔记',
        hint: '打开笔记后可将其加入收藏夹',
      }
    }
    return {
      icon: '⭐',
      title: '收藏夹',
      desc: `共 ${notebookStore.favorites.length} 篇收藏`,
      hint: '请从左侧列表选择一篇笔记查看',
    }
  }

  if (mode === 'trash') {
    if (!notebookStore.trash.length) {
      return {
        icon: '🗑️',
        title: '垃圾箱为空',
        desc: '删除的内容会暂存在这里',
        hint: '删除笔记或文件夹后，可在此恢复',
      }
    }
    return {
      icon: '🗑️',
      title: '垃圾箱',
      desc: `共 ${notebookStore.trash.length} 项`,
      hint: '请从左侧列表选择一项，在右侧恢复或永久删除',
    }
  }

  return {
    icon: '📋',
    title: '请选择内容',
    desc: '从左侧菜单开始浏览',
    hint: '',
  }
})
</script>

<template>
  <div class="empty-panel">
    <div class="empty-card">
      <span class="empty-icon">{{ panel.icon }}</span>
      <h2>{{ panel.title }}</h2>
      <p class="desc">{{ panel.desc }}</p>
      <p v-if="panel.hint" class="hint">{{ panel.hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.empty-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 32px;
}

.empty-card {
  text-align: center;
  max-width: 400px;
  padding: 48px 40px;
  border: 1px dashed #e2e8f0;
  border-radius: 16px;
  background: #fafafa;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-card h2 {
  margin: 0 0 10px;
  font-size: 20px;
  color: #1e293b;
}

.desc {
  margin: 0 0 8px;
  font-size: 15px;
  color: #64748b;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
}
</style>
