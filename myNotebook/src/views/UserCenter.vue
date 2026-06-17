<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import UserSettingShell from '@/components/user/UserSettingShell.vue'
import SettingGroup from '@/components/user/SettingGroup.vue'
import SettingCell from '@/components/user/SettingCell.vue'
import { resolveAvatarUrl, getAvatarInitial } from '@/utils/avatar'

const router = useRouter()
const userStore = useUserStore()

const displayName = computed(
  () => userStore.userInfo?.nickname || userStore.userInfo?.username || '用户'
)

const username = computed(() => userStore.userInfo?.username || '')

const avatarUrl = computed(() => resolveAvatarUrl(userStore.userInfo?.avatar))

const avatarInitial = computed(() => getAvatarInitial(displayName.value))

onMounted(async () => {
  try {
    await userStore.fetchUserInfo()
  } catch {
    /* ignore */
  }
})

async function handleLogout() {
  await userStore.logout()
  router.push('/login')
}
</script>

<template>
  <UserSettingShell title="用户中心" back-to="/">
    <button type="button" class="profile-card" @click="router.push('/user/profile')">
      <span class="avatar">
        <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="avatar-img" />
        <span v-else class="avatar-text">{{ avatarInitial }}</span>
      </span>
      <span class="profile-info">
        <span class="profile-name">{{ displayName }}</span>
        <span class="profile-id">用户名：{{ username }}</span>
      </span>
      <span class="profile-arrow" aria-hidden="true">›</span>
    </button>

    <SettingGroup :margin-top="false">
      <SettingCell
        label="个人资料"
        :value="displayName"
        arrow
        @click="router.push('/user/profile')"
      />
    </SettingGroup>

    <SettingGroup>
      <SettingCell
        label="修改密码"
        arrow
        @click="router.push('/user/password')"
      />
    </SettingGroup>

    <SettingGroup>
      <SettingCell label="使用帮助" arrow @click="router.push('/help')" />
      <SettingCell label="关于" arrow :border="false" @click="router.push('/about')" />
    </SettingGroup>

    <SettingGroup>
      <SettingCell label="退出登录" danger :border="false" @click="handleLogout" />
    </SettingGroup>
  </UserSettingShell>
</template>

<style scoped>
.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 20px 16px;
  margin-bottom: 12px;
  border: none;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.profile-card:active {
  background: #ececec;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #576b95;
  color: #fff;
  font-size: 26px;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  line-height: 1;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #191919;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-id {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-arrow {
  flex-shrink: 0;
  font-size: 22px;
  color: #c7c7cc;
  font-weight: 300;
}
</style>
