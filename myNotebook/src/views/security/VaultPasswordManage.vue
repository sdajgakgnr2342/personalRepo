<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import SettingCell from '@/components/user/SettingCell.vue'

const router = useRouter()
const vaultStore = useVaultStore()

const statusText = computed(() => {
  const s = vaultStore.profile?.vaultStatus || 'uninitialized'
  const map = {
    uninitialized: '未开通',
    active: '已开通',
    locked: '已开通',
    pending_new_password: '待设置新密码',
  }
  return map[s] || s
})

onMounted(() => vaultStore.fetchProfile())
</script>

<template>
  <UserSettingShell title="文件保险库密码" back-to="/security-manage">
    <SettingGroup :margin-top="false">
      <SettingCell label="当前状态" :value="statusText" as="div" />
    </SettingGroup>

    <SettingGroup v-if="vaultStore.profile?.vaultStatus === 'uninitialized'">
      <SettingCell
        label="开通保险库"
        arrow
        :border="false"
        @click="router.push('/security-manage/vault/setup')"
      />
    </SettingGroup>

    <SettingGroup v-else-if="vaultStore.profile?.canSetNewPassword || vaultStore.profile?.vaultStatus === 'pending_new_password'">
      <SettingCell
        label="设置新密码"
        value="管理员已批准恢复"
        arrow
        :border="false"
        @click="router.push('/security-manage/vault/new-password')"
      />
    </SettingGroup>

    <template v-else>
      <SettingGroup>
        <SettingCell
          label="修改密码"
          value="记得当前密码"
          arrow
          @click="router.push('/security-manage/vault/change')"
        />
        <SettingCell
          label="忘记密码"
          value="申请管理员恢复"
          arrow
          :border="false"
          @click="router.push('/security-manage/vault/recovery')"
        />
      </SettingGroup>
    </template>

    <p class="note">
      保险库密码与登录密码、计算器暗号相互独立。忘记密码需提交申请，由管理员人工审核后重置，<strong>不会丢失已上传的加密文件</strong>。
    </p>
  </UserSettingShell>
</template>

<style scoped>
.note {
  margin: 16px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  background: #eff6ff;
  border-radius: 8px;
}
</style>
