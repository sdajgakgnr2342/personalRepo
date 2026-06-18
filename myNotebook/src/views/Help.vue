<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { MAX_ATTACHMENT_SIZE_LABEL, MAX_AVATAR_SIZE_LABEL } from '@/config/upload'

const router = useRouter()
</script>

<template>
  <div class="help">
    <button type="button" class="back-link" @click="router.back()">返回</button>
    <h1>使用帮助</h1>
    <p class="intro">
      myNotebook 是一款支持文件夹管理、加密保护、富文本编辑与附件管理的个人笔记应用。
      登录后进入笔记本主界面，左侧为导航菜单，右侧为内容区。
    </p>

    <section class="section">
      <h2><AppIcon name="home" :size="20" alt="" /> 首页</h2>
      <ul>
        <li>左侧菜单点击「首页」，右侧展示笔记统计与最近动态。</li>
        <li>顶部指标卡片包括：笔记总数、近 7 天更新、草稿数量，并显示环比变化趋势。</li>
        <li>「快速入口」可一键跳转至我的笔记、草稿箱、收藏夹。</li>
        <li>「最近动态」列出近期编辑的笔记与草稿，点击可直接打开。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="my-notes" :size="20" alt="" /> 我的笔记</h2>
      <ul>
        <li>左侧点击「我的笔记」，右侧显示完整目录树（文件夹与笔记）。</li>
        <li>点击文件夹可展开/收起子内容；点击笔记在右侧打开编辑器。</li>
        <li>目录树右上角 <strong>+</strong> 可新建文件夹或笔记；在空白处或文件夹上<strong>右键</strong>也可新建、删除。</li>
        <li>新建文件夹时可勾选「加密」，设置至少 6 位密码。</li>
        <li>侧栏菜单可收起，收起后仅显示图标，状态会保存在本地。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="edit" :size="20" alt="" /> 笔记编辑</h2>
      <ul>
        <li>支持加粗、倾斜、对齐、字号、颜色等富文本格式，以及撤销/重做。</li>
        <li>点击标题旁的编辑图标可修改标题；新建笔记时会自动进入标题编辑。</li>
        <li>正文约 2 秒无操作后自动保存，标题旁显示保存状态。</li>
        <li>「插入图片」「附件」上传的文件存储于阿里云 OSS，保存后笔记内引用 OSS 地址。</li>
        <li>「清空」可清除笔记正文与内嵌图片（需二次确认）。</li>
        <li>切换笔记或离开页面前，如有未保存修改会提示确认。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="drafts" :size="20" alt="" /> 草稿箱</h2>
      <ul>
        <li>左侧「草稿箱」展开后可查看所有草稿笔记列表，点击即可继续编辑。</li>
        <li>草稿在首页统计与最近动态中也会单独标识。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="favorites" :size="20" alt="" /> 收藏</h2>
      <ul>
        <li>打开笔记后，点击工具栏「收藏」按钮即可加入/取消收藏。</li>
        <li>左侧「收藏夹」展开后可快速访问已收藏的笔记。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="lock" :size="20" alt="" /> 加密文件夹</h2>
      <ul>
        <li>未解锁时，加密文件夹的子内容在目录树中隐藏。</li>
        <li>点击带锁图标的文件夹，输入密码解锁；解锁后默认 5 分钟内再次访问无需重复输入。</li>
        <li>加密文件夹内的笔记内容在数据库中加密存储，且不支持分享。</li>
        <li>删除含加密文件夹的内容时，需输入对应密码验证。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="trash" :size="20" alt="" /> 垃圾箱</h2>
      <ul>
        <li>删除笔记或文件夹后，内容移入「垃圾箱」，不会立即永久删除。</li>
        <li>左侧展开垃圾箱列表，点击项目后右侧可进行「恢复」或「永久删除」。</li>
        <li>若父文件夹仍在垃圾箱中，需先恢复父文件夹，再恢复子项。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="share" :size="20" alt="" /> 分享与搜索</h2>
      <ul>
        <li>笔记保存后，点击「分享」可复制公开链接；他人无需登录即可阅读（加密笔记不可分享）。</li>
        <li>顶栏搜索框支持按标题或内容搜索笔记（不含未解锁的加密笔记）。</li>
        <li>移动端点击搜索图标展开搜索框，搜索完成后自动收起。</li>
      </ul>
    </section>

    <section class="section">
      <h2><AppIcon name="user" :size="20" alt="" /> 用户中心</h2>
      <ul>
        <li>顶栏用户图标或侧栏「用户中心」进入账户设置。</li>
        <li>「个人资料」可修改昵称；头像上传至阿里云 OSS（支持 JPG、PNG 等，最大 {{ MAX_AVATAR_SIZE_LABEL }}）。</li>
        <li>「修改密码」需验证原密码后设置新密码。</li>
        <li>侧栏底部还提供「帮助」与「关于」入口。</li>
      </ul>
    </section>

    <section class="section">
      <h2>快捷操作</h2>
      <ul>
        <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> / 工具栏「撤销」：撤销编辑</li>
        <li><kbd>Esc</kbd>：关闭图片预览、右键菜单或搜索框</li>
        <li>顶栏「刷新」：重新加载数据并保持当前视图</li>
        <li>移动端：左上角菜单按钮打开侧栏导航</li>
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
