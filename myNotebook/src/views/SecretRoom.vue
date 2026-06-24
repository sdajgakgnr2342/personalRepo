<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { lockSecretRoom } from '@/utils/secretRoom'
import { getVaultSession } from '@/utils/vaultSession'

const router = useRouter()
const vaultStore = useVaultStore()
const ready = ref(false)

onMounted(async () => {
  try {
    await vaultStore.fetchProfile()
    const p = vaultStore.profile

    if (p?.canSetNewPassword || p?.vaultStatus === 'pending_new_password') {
      router.replace('/secret-room/new-password')
      return
    }
    if (p?.vaultStatus === 'uninitialized') {
      router.replace('/secret-room/setup')
      return
    }
    if (getVaultSession() && vaultStore.vmk) {
      router.replace('/secret-room/vault')
      return
    }
    router.replace('/secret-room/unlock')
  } finally {
    ready.value = true
  }
})

function handleLeave() {
  vaultStore.lock()
  lockSecretRoom()
  router.push('/')
}
</script>

<template>
  <div class="hub">
    <template v-if="ready">
      <p>正在进入保险库…</p>
      <button type="button" class="leave-btn" @click="handleLeave">离开隐藏空间</button>
    </template>
    <p v-else>加载中…</p>
  </div>
</template>

<style scoped>
.hub {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  color: #64748b;
}

.leave-btn {
  margin-top: 16px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
</style>
