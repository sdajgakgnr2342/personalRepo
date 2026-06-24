<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const appTitle = import.meta.env.VITE_APP_TITLE || 'myNotebook'

const clickCount = ref(0)
let resetTimer = null

const REQUIRED_CLICKS = 5
const CLICK_WINDOW_MS = 2000

function handleFooterClick() {
  clickCount.value += 1
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    clickCount.value = 0
  }, CLICK_WINDOW_MS)

  if (clickCount.value >= REQUIRED_CLICKS) {
    clickCount.value = 0
    router.push('/security-manage')
  }
}

onUnmounted(() => {
  clearTimeout(resetTimer)
})
</script>

<template>
  <div class="about">
    <button type="button" class="back-link" @click="router.back()">返回</button>
    <h1>关于 {{ appTitle }}</h1>
    <p class="intro">
      {{ appTitle }} 是一款个人在线笔记本，帮助你整理思路、记录生活与工作。
      你可以像使用实体笔记本一样，建立文件夹、撰写笔记，并在需要时快速找到它们。
    </p>

    <section class="section">
      <h2>主要功能</h2>
      <ul>
        <li>树形目录管理笔记与文件夹</li>
        <li>富文本编辑，支持图片与附件</li>
        <li>草稿箱、收藏夹与垃圾箱</li>
        <li>加密文件夹，保护私密内容</li>
        <li>笔记分享与用户中心</li>
        <li>内置计算器等小工具</li>
      </ul>
    </section>

    <section class="section">
      <h2>使用建议</h2>
      <ul>
        <li>重要笔记建议定期整理到对应文件夹</li>
        <li>私密内容可使用加密文件夹存放</li>
        <li>更多操作说明请查看「帮助」页面</li>
      </ul>
    </section>

    <p class="footer-note" @click="handleFooterClick">
      感谢使用 {{ appTitle }}。
    </p>
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

.footer-note {
  margin-top: 40px;
  font-size: 14px;
  color: #94a3b8;
  user-select: none;
}
</style>
