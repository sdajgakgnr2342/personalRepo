<script setup>
import { computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

const emit = defineEmits(['open-note'])
const notebookStore = useNotebookStore()

const stats = computed(() => notebookStore.stats)

const metricCards = computed(() => {
  const s = stats.value
  const deltas = s.deltas || {}
  const trends = s.trends || {}
  return [
    {
      key: 'notes',
      label: '笔记总数',
      value: s.noteCount || 0,
      delta: deltas.noteCount ?? 0,
      trend: trends.notes || [],
      tone: 'blue',
      icon: 'note',
    },
    {
      key: 'drafts',
      label: '草稿数量',
      value: s.draftCount || 0,
      delta: deltas.draftCount ?? 0,
      trend: trends.drafts || [],
      tone: 'orange',
      icon: 'drafts',
    },
    {
      key: 'updates',
      label: '近7天更新',
      value: s.weeklyUpdateCount ?? s.recentNotes?.length ?? 0,
      delta: deltas.weeklyUpdates ?? 0,
      trend: trends.updates || [],
      tone: 'green',
      icon: 'stats',
    },
  ]
})

const displayNotes = computed(() => {
  const recent = (stats.value.recentNotes || []).map((note) => ({
    ...note,
    isDraft: false,
  }))
  const recentIds = new Set(recent.map((n) => n.id))
  const draftItems = (notebookStore.drafts || [])
    .filter((d) => !recentIds.has(d.id))
    .slice(0, 5)
    .map((note) => ({
      ...note,
      isDraft: true,
      status: 'draft',
    }))
  return [...draftItems, ...recent].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  )
})

function formatDelta(value) {
  if (!value) return '持平'
  return value > 0 ? `+${value}篇` : `${value}篇`
}

function deltaClass(value) {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

function sparklinePolyline(data, width = 72, height = 22) {
  if (!data?.length) return ''
  const max = Math.max(...data, 1)
  const step = width / Math.max(data.length - 1, 1)
  return data
    .map((v, i) => {
      const x = (i * step).toFixed(1)
      const y = (height - 3 - (v / max) * (height - 8)).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (dateStart.getTime() === todayStart.getTime()) return `${Math.floor(diff / 3600000)}小时前`
  if (dateStart.getTime() === yesterdayStart.getTime()) return '昨天'
  if (now.getFullYear() === d.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return d.toLocaleDateString('zh-CN')
}

function formatWordCount(count) {
  if (!count) return '空'
  return `${count}字`
}

function getNoteStatus(note) {
  if (note.isDraft || note.status === 'draft') return 'draft'
  if (!note.updatedAt) return 'stale'
  const d = new Date(note.updatedAt)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dateStart.getTime() === todayStart.getTime()) return 'today'
  const days = (todayStart - dateStart) / 86400000
  if (days > 3) return 'stale'
  return 'active'
}

function statusLabel(status) {
  if (status === 'today') return '今日更新'
  if (status === 'stale') return '超过3天未动'
  if (status === 'draft') return '草稿'
  return '近期活跃'
}

function openNote(note) {
  emit('open-note', note)
}

function goMode(mode) {
  notebookStore.setSidebarMode(mode)
}

const quickEntries = [
  { key: 'tree', label: '我的笔记', icon: 'my-notes', mode: 'tree' },
  { key: 'drafts', label: '草稿箱', icon: 'drafts', mode: 'drafts' },
  { key: 'favorites', label: '收藏夹', icon: 'favorites', mode: 'favorites' },
]
</script>

<template>
  <div class="stats-panel">
    <header class="stats-header">
      <h2><AppIcon name="home" :size="22" alt="" /> 首页</h2>
    </header>

    <div class="stats-cards">
      <article
        v-for="card in metricCards"
        :key="card.key"
        class="metric-card"
        :class="`metric-card--${card.tone}`"
      >
        <div class="metric-card-top">
          <AppIcon :name="card.icon" :size="18" class="metric-icon" alt="" />
          <span class="metric-delta" :class="deltaClass(card.delta)">
            {{ formatDelta(card.delta) }}
          </span>
        </div>
        <div class="metric-num">{{ card.value }}</div>
        <div class="metric-label">{{ card.label }}</div>
        <svg
          class="metric-sparkline"
          viewBox="0 0 72 22"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            :points="sparklinePolyline(card.trend)"
          />
        </svg>
      </article>
    </div>

    <section class="quick-section">
      <div class="section-head">
        <h3>快速入口</h3>
      </div>
      <div class="quick-cards">
        <button
          v-for="item in quickEntries"
          :key="item.key"
          type="button"
          class="quick-card"
          @click="goMode(item.mode)"
        >
          <AppIcon :name="item.icon" :size="22" alt="" />
          <span class="quick-card-label">{{ item.label }}</span>
        </button>
      </div>
    </section>

    <section class="recent-section">
      <div class="section-head">
        <h3>最近动态</h3>
        <span class="section-count">{{ displayNotes.length }} 篇</span>
      </div>

      <div v-if="displayNotes.length" class="note-list">
        <button
          v-for="note in displayNotes"
          :key="`${note.id}-${note.isDraft ? 'draft' : 'note'}`"
          type="button"
          class="note-row"
          @click="openNote(note)"
        >
          <span
            class="status-dot"
            :class="`status-dot--${getNoteStatus(note)}`"
            :title="statusLabel(getNoteStatus(note))"
          />
          <span class="note-main">
            <span class="note-name">{{ note.name || '无标题' }}</span>
            <span class="note-meta">
              <span class="note-words" :class="{ empty: !note.wordCount }">
                {{ formatWordCount(note.wordCount) }}
              </span>
              <span class="note-time">{{ formatRelativeTime(note.updatedAt) }}</span>
            </span>
          </span>
        </button>
      </div>

      <EmptyState
        v-else
        size="md"
        title="近7天暂无笔记更新"
        description="在「我的笔记」中创建或编辑笔记吧"
      />
    </section>
  </div>
</template>

<style scoped>
.stats-panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 32px;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 28%);
  -webkit-overflow-scrolling: touch;
}

.stats-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 20px;
  font-size: 13px;
  color: #94a3b8;
}

.stats-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.stats-cards::-webkit-scrollbar {
  display: none;
}

.metric-card {
  position: relative;
  flex: 0 0 148px;
  min-height: 132px;
  padding: 14px 14px 10px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.metric-card--blue {
  background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
}

.metric-card--orange {
  background: linear-gradient(145deg, #fff7ed 0%, #ffedd5 100%);
}

.metric-card--green {
  background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%);
}

.metric-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.metric-icon {
  opacity: 0.72;
}

.metric-delta {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
}

.metric-delta.up {
  color: #059669;
}

.metric-delta.down {
  color: #dc2626;
}

.metric-delta.flat {
  color: #64748b;
}

.metric-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.metric-label {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
}

.metric-sparkline {
  display: block;
  width: 100%;
  height: 22px;
  margin-top: 10px;
}

.metric-card--blue .metric-sparkline polyline {
  stroke: #3b82f6;
}

.metric-card--orange .metric-sparkline polyline {
  stroke: #f97316;
}

.metric-card--green .metric-sparkline polyline {
  stroke: #10b981;
}

.quick-section {
  margin-bottom: 24px;
}

.quick-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  border: none;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, background 0.12s;
}

.quick-card:active {
  transform: scale(0.98);
  background: #f8fafc;
}

.quick-card-label {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  line-height: 1.2;
}

.recent-section {
  margin-bottom: 8px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.section-count {
  font-size: 12px;
  color: #94a3b8;
}

.note-list {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.note-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 14px 14px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.note-row:last-child {
  border-bottom: none;
}

.note-row:active {
  background: #f8fafc;
}

.status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
}

.status-dot--today {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.status-dot--active {
  background: #3b82f6;
}

.status-dot--stale {
  background: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.18);
}

.status-dot--draft {
  background: #94a3b8;
}

.note-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.note-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.note-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.note-words {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.note-words.empty {
  font-style: italic;
  color: #cbd5e1;
}

.note-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

@media (min-width: 769px) {
  .stats-panel {
    padding: 32px 40px 40px;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    overflow: visible;
  }

  .metric-card {
    flex: none;
    min-height: 140px;
  }

  .note-row:hover {
    background: #f8fafc;
  }

  .quick-card:hover {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
    background: #f8fafc;
  }
}

@media (max-width: 768px) {
  .stats-panel {
    padding: 16px 14px 24px;
  }

  .stats-header h2 {
    font-size: 18px;
  }

  .subtitle {
    margin-bottom: 16px;
  }

  .stats-cards {
    margin-bottom: 20px;
  }

  .quick-section {
    margin-bottom: 20px;
  }

  .quick-card {
    padding: 12px 6px;
  }

  .recent-section {
    margin-bottom: 0;
  }

  .metric-card {
    flex: 0 0 136px;
    min-height: 124px;
    padding: 12px;
  }

  .metric-num {
    font-size: 28px;
  }

  .note-name {
    font-size: 14px;
  }
}
</style>
