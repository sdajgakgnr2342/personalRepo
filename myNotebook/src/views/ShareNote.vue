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
    <div v-if="loading" class="share-status">加载中…</div>
    <div v-else-if="error" class="share-status share-status--error">{{ error }}</div>
    <article v-else class="share-article">
      <h1 class="share-title">{{ note.name }}</h1>
      <p class="share-meta">
        <span>{{ note.author }}</span>
        <span class="share-meta-dot">·</span>
        <span>{{ note.wordCount }} 字</span>
        <span v-if="note.lastSavedAt" class="share-meta-dot">·</span>
        <span v-if="note.lastSavedAt">{{ note.lastSavedAt }}</span>
      </p>
      <div class="share-content" v-html="safeContent" />
    </article>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
  box-sizing: border-box;
}

.share-status {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #64748b;
}

.share-status--error {
  color: #ef4444;
}

.share-article {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px 16px 32px;
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(32px, env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.share-title {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  color: #191919;
  word-break: break-word;
}

.share-meta {
  margin: 0 0 24px;
  font-size: 13px;
  line-height: 1.5;
  color: #999;
}

.share-meta-dot {
  margin: 0 6px;
}

.share-content {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  word-break: break-word;
}

.share-content :deep(p) {
  margin: 0 0 0.75em;
}

.share-content :deep(p:last-child) {
  margin-bottom: 0;
}

.share-content :deep(.content-img-wrap),
.share-content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
}

.share-content :deep(.content-img-wrap) {
  width: fit-content;
  max-width: 100%;
}

.share-content :deep(.content-img),
.share-content :deep(img) {
  border-radius: 0;
  border: none;
}

.share-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

@media (min-width: 768px) {
  .share-article {
    padding: 32px 40px 48px;
  }

  .share-title {
    font-size: 26px;
  }
}
</style>
