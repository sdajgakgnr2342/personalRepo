<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSharedNote } from '@/api/item'
import { sanitizeNoteHtml } from '@/utils/sanitizeHtml'

const route = useRoute()
const note = ref(null)
const loading = ref(true)
const error = ref('')

const safeContent = computed(() => sanitizeNoteHtml(note.value?.content || ''))

onMounted(async () => {
  try {
    note.value = await getSharedNote(route.params.token)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="share-page">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <article v-else class="share-article">
      <header>
        <h1>{{ note.name }}</h1>
        <p class="author">作者：{{ note.author }}</p>
      </header>
      <div class="content" v-html="safeContent" />
      <footer>
        <span>{{ note.wordCount }} 字</span>
        <span>最后保存：{{ note.lastSavedAt }}</span>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #f8fafc;
}

.share-article {
  max-width: 720px;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  border: 1px solid #e5e7eb;
}

.share-article h1 {
  font-size: 24px;
  margin: 0 0 8px;
}

.author {
  color: #9ca3af;
  font-size: 14px;
  margin-bottom: 24px;
}

.content {
  line-height: 1.8;
  font-size: 15px;
  color: #374151;
  word-break: break-word;
}

.content :deep(img) {
  display: block;
  max-width: 100%;
  margin: 12px 0;
  border-radius: 8px;
}

footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #9ca3af;
}

.loading, .error {
  font-size: 16px;
  color: #64748b;
}

.error {
  color: #ef4444;
}
</style>
