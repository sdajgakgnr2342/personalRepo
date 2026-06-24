<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useVaultStore } from '@/stores/vault'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import SettingCell from '@/components/user/SettingCell.vue'
import { listEncryptedFolders } from '@/api/item'

const router = useRouter()
const userStore = useUserStore()
const vaultStore = useVaultStore()

const folderCount = ref(0)
const loading = ref(true)

const secretCodeStatus = computed(() => {
  if (!userStore.userInfo) return '加载中…'
  return userStore.userInfo.secretCodeSet ? '已设置' : '未设置'
})

const vaultStatusText = computed(() => {
  const s = vaultStore.profile?.vaultStatus || 'uninitialized'
  const map = {
    uninitialized: '未开通',
    active: '已开通',
    locked: '已开通',
    pending_new_password: '待设置新密码',
  }
  let text = map[s] || s
  if (vaultStore.profile?.hasPendingRecoveryRequest) {
    text += ' · 恢复申请中'
  }
  return text
})

onMounted(async () => {
  loading.value = true
  try {
    if (!userStore.userInfo) {
      await userStore.fetchUserInfo()
    }
    await vaultStore.fetchProfile()
    const folders = await listEncryptedFolders()
    folderCount.value = folders?.length || 0
  } catch {
    folderCount.value = 0
  } finally {
    loading.value = false
  }
})

function goSecretCode() {
  if (userStore.userInfo?.secretCodeSet) {
    router.push('/security-manage/secret-code')
  } else {
    router.push('/secret-code-setup')
  }
}

function goVault() {
  const s = vaultStore.profile?.vaultStatus
  if (s === 'uninitialized') {
    router.push('/security-manage/vault/setup')
  } else if (s === 'pending_new_password' || vaultStore.profile?.canSetNewPassword) {
    router.push('/security-manage/vault/new-password')
  } else {
    router.push('/security-manage/vault')
  }
}

function goFolders() {
  router.push('/security-manage/folders')
}
</script>

<template>
  <UserSettingShell title="安全凭证管理" back-to="/about">
    <p class="intro">
      在此管理计算器暗号、文件保险库密码与加密文件夹密码。忘记密码时可使用对应恢复方式。
    </p>

    <SettingGroup :margin-top="false">
      <SettingCell
        label="计算器暗号"
        :value="secretCodeStatus"
        arrow
        @click="goSecretCode"
      />
      <p class="hint">用于进入隐藏空间（计算器入口）。</p>
    </SettingGroup>

    <SettingGroup>
      <SettingCell
        label="文件保险库密码"
        :value="loading ? '…' : vaultStatusText"
        arrow
        @click="goVault"
      />
      <p class="hint">独立于登录密码，用于加密上传的文件。</p>
    </SettingGroup>

    <SettingGroup>
      <SettingCell
        label="加密文件夹密码"
        :value="loading ? '…' : `${folderCount} 个文件夹`"
        arrow
        :border="false"
        @click="goFolders"
      />
      <p class="hint">笔记本中带锁文件夹的访问密码，可逐个修改或重置。</p>
    </SettingGroup>
  </UserSettingShell>
</template>

<style scoped>
.intro {
  margin: 0 0 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #576b95;
  background: #fff;
}

.hint {
  margin: 0;
  padding: 0 16px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #94a3b8;
  background: #fff;
  border-bottom: 1px solid #ededed;
}

:deep(.setting-group:last-child .hint) {
  border-bottom: none;
}
</style>
