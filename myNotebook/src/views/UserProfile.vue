<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import { toastSuccess, toastError } from '@/utils/toast'
import { MAX_AVATAR_SIZE, MAX_AVATAR_SIZE_LABEL } from '@/config/upload'
import { resolveAvatarUrl, getAvatarInitial } from '@/utils/avatar'

const router = useRouter()
const userStore = useUserStore()

const nickname = ref('')
const loading = ref(false)
const avatarLoading = ref(false)
const errorMsg = ref('')
const fileInputRef = ref(null)

const username = computed(() => userStore.userInfo?.username || '')

const avatarUrl = computed(() => resolveAvatarUrl(userStore.userInfo?.avatar))

const avatarInitial = computed(() =>
  getAvatarInitial(userStore.userInfo?.nickname || userStore.userInfo?.username)
)

const avatarActionText = computed(() => (avatarUrl.value ? '更换头像' : '上传头像'))

const joinedAt = computed(() => {
  const raw = userStore.userInfo?.created_at
  if (!raw) return '-'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('zh-CN')
})

onMounted(async () => {
  try {
    await userStore.fetchUserInfo()
  } catch {
    /* ignore */
  }
  nickname.value = userStore.userInfo?.nickname || userStore.userInfo?.username || ''
})

function openAvatarPicker() {
  if (avatarLoading.value) return
  fileInputRef.value?.click()
}

async function handleAvatarChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > MAX_AVATAR_SIZE) {
    toastError(`头像大小超出限制（最大 ${MAX_AVATAR_SIZE_LABEL}）`)
    return
  }

  avatarLoading.value = true
  errorMsg.value = ''
  try {
    await userStore.uploadAvatar(file)
    toastSuccess('头像已更新')
  } catch (err) {
    toastError(err.message || '头像上传失败')
  } finally {
    avatarLoading.value = false
  }
}

async function handleSave() {
  const trimmed = nickname.value.trim()
  if (!trimmed) {
    errorMsg.value = '昵称不能为空'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await userStore.updateProfile({ nickname: trimmed })
    toastSuccess('已保存')
    router.push('/user')
  } catch (err) {
    errorMsg.value = err.message || '保存失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UserSettingShell title="个人资料">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
      hidden
      @change="handleAvatarChange"
    />

    <SettingGroup :margin-top="false">
      <button type="button" class="avatar-cell" :disabled="avatarLoading" @click="openAvatarPicker">
        <span class="cell-label">头像</span>
        <span class="avatar-cell-right">
          <span class="avatar-thumb">
            <img v-if="avatarUrl" :src="avatarUrl" alt="头像" />
            <span v-else class="avatar-fallback">{{ avatarInitial }}</span>
          </span>
          <span class="avatar-action">{{ avatarLoading ? '上传中...' : avatarActionText }}</span>
          <span class="cell-arrow" aria-hidden="true">›</span>
        </span>
      </button>
    </SettingGroup>

    <SettingGroup>
      <div class="form-cell">
        <span class="cell-label">昵称</span>
        <input
          v-model="nickname"
          type="text"
          maxlength="50"
          placeholder="请输入昵称"
          class="cell-input"
        />
      </div>
      <div class="form-cell no-border">
        <span class="cell-label">用户名</span>
        <span class="cell-readonly">{{ username }}</span>
      </div>
    </SettingGroup>

    <SettingGroup>
      <div class="form-cell no-border">
        <span class="cell-label">注册时间</span>
        <span class="cell-readonly">{{ joinedAt }}</span>
      </div>
    </SettingGroup>

    <p v-if="errorMsg" class="form-tip error">{{ errorMsg }}</p>
    <p v-else class="form-tip">支持 JPG、PNG、GIF、WebP，大小不超过 {{ MAX_AVATAR_SIZE_LABEL }}</p>

    <button type="button" class="submit-btn" :disabled="loading" @click="handleSave">
      {{ loading ? '保存中...' : '保存' }}
    </button>
  </UserSettingShell>
</template>

<style scoped>
.avatar-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 72px;
  padding: 12px 16px;
  border: none;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.avatar-cell:active:not(:disabled) {
  background: #ececec;
}

.avatar-cell:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.avatar-cell-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-left: auto;
}

.avatar-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #576b95;
  flex-shrink: 0;
}

.avatar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.avatar-action {
  font-size: 15px;
  color: #888;
  white-space: nowrap;
}

.cell-arrow {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
  color: #c7c7cc;
  font-weight: 300;
}

.form-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid #ededed;
}

.form-cell.no-border {
  border-bottom: none;
}

.cell-label {
  flex-shrink: 0;
  min-width: 88px;
  font-size: 16px;
  color: #191919;
  white-space: nowrap;
}

.cell-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #191919;
  text-align: right;
  outline: none;
}

.cell-input::placeholder {
  color: #c7c7cc;
}

.cell-readonly {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  color: #888;
  text-align: right;
  white-space: nowrap;
}

.form-tip {
  margin: 12px 16px 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.form-tip.error {
  color: #fa5151;
}

.submit-btn {
  display: block;
  width: calc(100% - 32px);
  max-width: 608px;
  margin: 28px auto 0;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #07c160;
  color: #fff;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
}

.submit-btn:active:not(:disabled) {
  background: #06ad56;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
