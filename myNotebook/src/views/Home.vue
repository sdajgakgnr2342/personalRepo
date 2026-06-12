<script setup>
const features = [
  { title: 'Vue Router', desc: '路由懒加载、导航守卫、页面标题' },
  { title: 'Axios 封装', desc: '请求/响应拦截、Token 注入、统一错误处理' },
  { title: 'Pinia', desc: '模块化状态管理，支持组合式 API' },
  { title: '环境变量', desc: '开发/生产环境分离，Vite 代理转发' },
]
</script>

<template>
  <div class="home">
    <h1>欢迎使用 myNotebook</h1>
    <p class="subtitle">一款基于Node+Vue3+Vite+Mysql的在线笔记应用。</p>
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
}

.subtitle {
  margin-bottom: 32px;
  color: var(--text);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: left;
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: var(--shadow);
}

.card h2 {
  margin-bottom: 8px;
}

.card p {
  font-size: 14px;
  line-height: 1.5;
}
</style>
