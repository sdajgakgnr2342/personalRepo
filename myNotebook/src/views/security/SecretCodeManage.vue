<script setup>
import { useRouter } from 'vue-router'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import SettingCell from '@/components/user/SettingCell.vue'

const router = useRouter()
</script>

<template>
  <UserSettingShell title="计算器暗号" back-to="/security-manage">
    <SettingGroup :margin-top="false">
      <SettingCell
        label="记得当前暗号"
        value="修改暗号"
        arrow
        @click="router.push('/security-manage/secret-code/reset')"
      />
      <SettingCell
        label="忘记暗号"
        value="凭登录密码重置"
        arrow
        :border="false"
        @click="router.push('/security-manage/secret-code/forgot')"
      />
    </SettingGroup>

    <p class="note">
      修改暗号后，请使用新暗号在计算器中验证进入隐藏空间。忘记暗号时，需验证<strong>登录密码</strong>后重新设置。
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
  background: #fffbeb;
  border-radius: 8px;
}
</style>
