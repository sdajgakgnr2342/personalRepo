<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="about">
    <button type="button" class="back-link" @click="router.back()">返回</button>
    <h1>关于 myNotebook</h1>
    <p class="intro">
      myNotebook 是一款前后端分离的个人在线笔记本，支持树形目录、富文本编辑、加密文件夹、
      附件管理、分享链接与用户中心等能力。
    </p>

    <section class="section">
      <h2>技术架构</h2>
      <ul>
        <li><strong>前端</strong>：Vue 3、Vite、Vue Router、Pinia、Axios</li>
        <li><strong>后端</strong>：Node.js、Express、MySQL</li>
        <li><strong>安全</strong>：JWT 登录鉴权、bcrypt 密码哈希、HTML 消毒、附件签名访问</li>
        <li><strong>部署</strong>：Nginx 托管前端静态资源，反向代理 API，独立目录存放上传文件</li>
      </ul>
    </section>

    <section class="section">
      <h2>前端结构</h2>
      <pre><code>myNotebook/src/
├── api/              # 接口封装（auth、item、notebook）
├── assets/           # 图标与静态资源
├── components/
│   ├── notebook/     # 笔记本核心组件（编辑器、目录树、侧栏等）
│   └── user/         # 用户中心组件
├── router/           # 路由（笔记本、登录、分享、用户中心等）
├── stores/           # Pinia 状态（notebook、user）
├── utils/            # 工具（request、auth、toast、sanitize）
└── views/            # 页面视图</code></pre>
    </section>

    <section class="section">
      <h2>后端结构</h2>
      <pre><code>notebook_back/src/
├── config/           # 数据库配置
├── controllers/      # 业务控制器
│   ├── authController.js       # 登录注册、资料、头像
│   ├── itemController.js       # 笔记/文件夹 CRUD
│   ├── attachmentController.js # 附件上传下载
│   └── statsController.js      # 首页统计
├── middleware/       # JWT 鉴权
├── routes/           # API 路由
└── utils/            # 加密、HTML 消毒、树形结构等</code></pre>
    </section>

    <section class="section">
      <h2>主要 API</h2>
      <ul>
        <li><code>/api/auth</code> — 登录、注册、用户资料、头像、改密</li>
        <li><code>/api/notebook</code> — 目录树、草稿、收藏、垃圾箱、统计数据</li>
        <li><code>/api/items</code> — 笔记/文件夹增删改、保存、搜索、分享、加密解锁</li>
        <li><code>/uploads</code> — 历史本地上传文件（兼容访问）</li>
        <li>附件、头像等新上传文件存储于阿里云 OSS</li>
      </ul>
    </section>

    <section class="section">
      <h2>数据模型</h2>
      <ul>
        <li><code>core_user</code> — 用户账号、昵称、头像</li>
        <li><code>nb_item</code> — 文件夹与笔记统一树结构</li>
        <li><code>nb_attachment</code> — 笔记附件</li>
        <li><code>nb_folder_unlock</code> — 加密文件夹临时解锁记录</li>
      </ul>
    </section>

    <section class="section">
      <h2>本地开发</h2>
      <ul>
        <li>前端：在 <code>myNotebook</code> 目录执行 <code>npm run dev</code></li>
        <li>后端：在 <code>notebook_back</code> 目录配置 <code>.env</code> 后执行 <code>npm run dev</code></li>
        <li>数据库：执行 <code>notebook_back/sql/init.sql</code> 初始化表结构</li>
        <li>前端 <code>.env.development</code> 中配置 API 代理地址</li>
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

.back-link {
  display: inline-block;
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: none;
  color: #576b95;
  font-size: 15px;
  cursor: pointer;
}

.back-link:hover {
  opacity: 0.85;
}

.intro {
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 8px;
}

.section {
  margin-top: 32px;
}

.section h2 {
  margin-bottom: 12px;
  font-size: 18px;
}

.section ul {
  padding-left: 20px;
  line-height: 2;
  color: #374151;
}

.section code {
  padding: 1px 5px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 13px;
}

pre {
  padding: 16px;
  background: var(--code-bg, #f8fafc);
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
</style>
