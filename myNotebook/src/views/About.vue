<template>
  <div class="about">
    <button type="button" class="back-btn" @click="$router.push('/')">← 返回笔记本</button>
    <h1>关于项目</h1>
    <p>基于 Vue 3 + Vite 构建的前后端分离开发框架。</p>

    <section class="section">
      <h2>目录结构</h2>
      <pre><code>src/
├── api/          # 接口模块
├── components/   # 公共组件
├── router/       # 路由配置
├── stores/       # Pinia 状态
├── utils/        # 工具函数（request、auth 等）
└── views/        # 页面视图</code></pre>
    </section>

    <section class="section">
      <h2>开发说明</h2>
      <ul>
        <li>在 <code>.env.development</code> 中配置后端代理地址</li>
        <li>在 <code>src/api/</code> 下按模块编写接口</li>
        <li>需要登录的页面在路由 <code>meta</code> 中设置 <code>requiresAuth: true</code></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px;
  text-align: left;
}

.back-btn {
  margin-bottom: 20px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
}

.back-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.section {
  margin-top: 32px;
}

.section h2 {
  margin-bottom: 12px;
}

.section ul {
  padding-left: 20px;
  line-height: 2;
}

pre {
  padding: 16px;
  background: var(--code-bg);
  border-radius: 8px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
}
</style>
