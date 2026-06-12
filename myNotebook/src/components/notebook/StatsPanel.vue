<script setup>
import { computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'

const emit = defineEmits(['open-note'])
const notebookStore = useNotebookStore()

const stats = computed(() => notebookStore.stats)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN')
}

function formatFullDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="stats-panel">
    <header class="stats-header">
      <h2>📊 数据统计</h2>
      <p class="subtitle">概览你的笔记使用情况</p>
    </header>

    <div class="stats-cards">
      <div class="card">
        <div class="card-icon">📄</div>
        <div class="card-body">
          <span class="card-num">{{ stats.noteCount || 0 }}</span>
          <span class="card-label">笔记总数</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">📝</div>
        <div class="card-body">
          <span class="card-num">{{ stats.draftCount || 0 }}</span>
          <span class="card-label">草稿数量</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">🕐</div>
        <div class="card-body">
          <span class="card-num">{{ stats.recentNotes?.length || 0 }}</span>
          <span class="card-label">近7天更新</span>
        </div>
      </div>
    </div>

    <section class="recent-section">
      <h3>最近7天笔记</h3>
      <div v-if="stats.recentNotes?.length" class="recent-table">
        <div class="table-head">
          <span>标题</span>
          <span>字数</span>
          <span>更新时间</span>
        </div>
        <div
          v-for="note in stats.recentNotes"
          :key="note.id"
          class="table-row"
          @click="emit('open-note', note)"
        >
          <span class="note-name">{{ note.name }}</span>
          <span class="note-words">{{ note.wordCount }} 字</span>
          <span class="note-time" :title="formatFullDate(note.updatedAt)">
            {{ formatDate(note.updatedAt) }}
          </span>
        </div>
      </div>
      <div v-else class="empty">
        <p>近7天暂无笔记更新</p>
        <p class="hint">在左侧「我的笔记」中创建或编辑笔记吧</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  background: #fff;
}

.stats-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #1e293b;
}

.subtitle {
  margin: 0 0 28px;
  font-size: 14px;
  color: #94a3b8;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.card-icon {
  font-size: 28px;
}

.card-num {
  display: block;
  font-size: 28px;
  font-weight: 600;
  color: #2563eb;
  line-height: 1.2;
}

.card-label {
  font-size: 13px;
  color: #64748b;
}

.recent-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #334155;
}

.recent-table {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1fr 80px 120px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}

.table-head {
  background: #f1f5f9;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.table-row {
  font-size: 14px;
  color: #374151;
  border-top: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:hover {
  background: #f8fafc;
}

.note-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-words,
.note-time {
  font-size: 13px;
  color: #94a3b8;
}

.empty {
  text-align: center;
  padding: 48px 24px;
  border: 1px dashed #e2e8f0;
  border-radius: 10px;
  color: #94a3b8;
}

.empty .hint {
  margin-top: 8px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .stats-panel {
    padding: 20px 16px;
  }
}
</style>
