<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import SettingCell from '@/components/user/SettingCell.vue'
import { listEncryptedFolders } from '@/api/item'

const router = useRouter()
const folders = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    folders.value = await listEncryptedFolders()
  } catch {
    folders.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <UserSettingShell title="加密文件夹" back-to="/security-manage">
    <p v-if="loading" class="empty">加载中…</p>
    <p v-else-if="!folders.length" class="empty">暂无加密文件夹</p>

    <SettingGroup v-else :margin-top="false">
      <SettingCell
        v-for="(folder, index) in folders"
        :key="folder.id"
        :label="folder.name"
        value="管理密码"
        arrow
        :border="index < folders.length - 1"
        @click="router.push(`/security-manage/folders/${folder.id}`)"
      />
    </SettingGroup>

    <p class="note">
      忘记文件夹密码时，可使用<strong>登录密码</strong>验证身份后重置。笔记内容不会丢失，但需用新密码重新解锁文件夹。
    </p>
  </UserSettingShell>
</template>

<style scoped>
.empty {
  padding: 32px 16px;
  text-align: center;
  color: #94a3b8;
  background: #fff;
}

.note {
  margin: 16px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
}
</style>
