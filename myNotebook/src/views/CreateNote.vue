<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  title: '',
  content: '',
})

const saved = ref(false)

function handleSubmit() {
  if (!form.title.trim()) return
  saved.value = true
}
</script>

<template>
  <div class="create-note">
    <h1>创建笔记</h1>
    <p class="subtitle">登录成功，欢迎开始记录你的想法。</p>

    <form class="note-form" @submit.prevent="handleSubmit">
      <label>
        标题
        <input v-model="form.title" type="text" placeholder="请输入笔记标题" />
      </label>

      <label>
        内容
        <textarea
          v-model="form.content"
          rows="8"
          placeholder="请输入笔记内容"
        />
      </label>

      <button type="submit">保存笔记</button>
    </form>

    <p v-if="saved" class="success">笔记已保存（演示模式，暂未对接后端）</p>
  </div>
</template>

<style scoped>
.create-note {
  max-width: 640px;
  margin: 0 auto;
  text-align: left;
}

.subtitle {
  margin-bottom: 24px;
  color: var(--text);
}

.note-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text);
}

input,
textarea {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
}

input:focus,
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

button {
  align-self: flex-start;
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.success {
  margin-top: 16px;
  color: #22c55e;
  font-size: 14px;
}
</style>
