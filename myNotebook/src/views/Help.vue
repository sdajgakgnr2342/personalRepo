<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
</script>

<template>
  <div class="help">
    <button type="button" class="back-link" @click="router.back()">返回</button>
    <h1>使用帮助</h1>
    <p class="intro">myNotebook 是一款支持文件夹管理、加密保护与富文本编辑的个人笔记应用。</p>

    <section class="section">
      <h2><AppIcon name="edit" :size="20" alt="" /> 笔记与文件夹</h2>
      <ul>
        <li>在左侧「我的笔记」旁点击 <strong>+</strong>，或右键文件夹，可新建文件夹或笔记。</li>
        <li>点击笔记可在右侧编辑；支持加粗、倾斜、对齐、字号、颜色等富文本格式。</li>
        <li>编辑内容约 2 秒无操作后自动保存，标题旁会显示保存状态。</li>
        <li>工具栏「插入图片」可将图片上传并插入正文；右键图片可查看或删除。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="favorites" :size="20" alt="" /> 收藏</h2>
      <ul>
        <li>打开笔记后，点击工具栏「收藏」按钮即可加入/取消收藏。</li>
        <li>左侧「收藏夹」可快速访问已收藏的笔记。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="lock" :size="20" alt="" /> 加密文件夹</h2>
      <ul>
        <li>新建文件夹时可勾选「加密」，设置至少 6 位密码。</li>
        <li>未解锁时，加密文件夹的子内容在目录树中隐藏。</li>
        <li>点击带锁图标的文件夹，输入密码解锁；解锁有效期默认 5 分钟。</li>
        <li>加密文件夹内的笔记内容在数据库中加密存储，且不支持分享。</li>
        <li>删除含加密文件夹的内容时，需输入对应密码验证。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="trash" :size="20" alt="" /> 垃圾箱</h2>
      <ul>
        <li>删除笔记或文件夹后，内容会移入左侧「垃圾箱」，不会立即永久删除。</li>
        <li>在垃圾箱中点击项目，右侧可进行「恢复」或「永久删除」。</li>
        <li>若父文件夹仍在垃圾箱中，需先恢复父文件夹，再恢复子项。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="share" :size="20" alt="" /> 分享与搜索</h2>
      <ul>
        <li>保存笔记后，点击「分享」可复制公开链接；他人无需登录即可阅读。</li>
        <li>顶部搜索框支持按标题或内容搜索笔记（不含未解锁的加密笔记）。</li>
      </ul>
    </section>

    <section class="section">
      <h2>快捷操作</h2>
      <ul>
        <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> / 工具栏「撤销」：撤销编辑</li>
        <li><kbd>Esc</kbd>：关闭图片预览或右键菜单</li>
        <li>顶栏「刷新」：重新加载数据并保持当前视图</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.help {
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 18px;
}

.section ul {
  padding-left: 20px;
  line-height: 2;
  color: #374151;
}

kbd {
  padding: 2px 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
}
</style>
