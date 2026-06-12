<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>抱歉，您访问的页面不存在。</p>
    <RouterLink to="/" class="back">返回首页</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 64px 24px;
}

.not-found h1 {
  font-size: 72px;
  margin-bottom: 16px;
}

.back {
  display: inline-block;
  margin-top: 24px;
  padding: 8px 20px;
  border-radius: 6px;
  background: var(--accent-bg);
  color: var(--accent);
  text-decoration: none;
  border: 1px solid var(--accent-border);
}

.back:hover {
  box-shadow: var(--shadow);
}
</style>
