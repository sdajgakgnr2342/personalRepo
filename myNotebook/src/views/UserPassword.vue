<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import { toastSuccess } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    errorMsg.value = '请填写完整密码信息'
    return
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = '新密码至少 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的新密码不一致'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await userStore.changePassword({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    })
    toastSuccess('密码修改成功')
    router.push('/user')
  } catch (err) {
    errorMsg.value = err.message || '修改失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UserSettingShell title="修改密码">
    <SettingGroup :margin-top="false">
      <div class="form-cell">
        <span class="cell-label">原密码</span>
        <input
          v-model="oldPassword"
          type="password"
          placeholder="请输入"
          autocomplete="current-password"
          class="cell-input"
        />
      </div>
      <div class="form-cell">
        <span class="cell-label">新密码</span>
        <input
          v-model="newPassword"
          type="password"
          placeholder="至少 6 位"
          autocomplete="new-password"
          class="cell-input"
        />
      </div>
      <div class="form-cell no-border">
        <span class="cell-label">确认密码</span>
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="再次输入"
          autocomplete="new-password"
          class="cell-input"
        />
      </div>
    </SettingGroup>

    <p v-if="errorMsg" class="form-tip error">{{ errorMsg }}</p>
    <p v-else class="form-tip">修改成功后请使用新密码登录</p>

    <button type="button" class="submit-btn" :disabled="loading" @click="handleSubmit">
      {{ loading ? '提交中...' : '确认修改' }}
    </button>
  </UserSettingShell>
</template>

<style scoped>
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
