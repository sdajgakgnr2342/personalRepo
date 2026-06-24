import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'
import { isSecretRoomUnlocked } from '@/utils/secretRoom'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Notebook',
    component: () => import('@/views/Notebook.vue'),
    meta: { title: '个人笔记本', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', guest: true },
  },
  {
    path: '/share/:token',
    name: 'Share',
    component: () => import('@/views/ShareNote.vue'),
    meta: { title: '分享笔记' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于', requiresAuth: true },
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('@/views/Help.vue'),
    meta: { title: '帮助', requiresAuth: true },
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: () => import('@/views/Calculator.vue'),
    meta: { title: '计算器', requiresAuth: true },
  },
  {
    path: '/secret-code-setup',
    name: 'SecretCodeSetup',
    component: () => import('@/views/SecretCodeSetup.vue'),
    meta: { title: '设置暗号', requiresAuth: true },
  },
  {
    path: '/secret-code-reset',
    name: 'SecretCodeReset',
    component: () => import('@/views/SecretCodeReset.vue'),
    meta: { title: '重置暗号', requiresAuth: true },
  },
  {
    path: '/security-manage',
    name: 'SecurityManage',
    component: () => import('@/views/security/SecurityManage.vue'),
    meta: { title: '安全凭证管理', requiresAuth: true },
  },
  {
    path: '/security-manage/secret-code',
    name: 'SecretCodeManage',
    component: () => import('@/views/security/SecretCodeManage.vue'),
    meta: { title: '计算器暗号', requiresAuth: true },
  },
  {
    path: '/security-manage/secret-code/reset',
    name: 'SecuritySecretCodeReset',
    component: () => import('@/views/SecretCodeReset.vue'),
    meta: { title: '修改暗号', requiresAuth: true },
  },
  {
    path: '/security-manage/secret-code/forgot',
    name: 'ForgotSecretCode',
    component: () => import('@/views/security/ForgotSecretCode.vue'),
    meta: { title: '重置暗号', requiresAuth: true },
  },
  {
    path: '/security-manage/vault',
    name: 'SecurityVaultManage',
    component: () => import('@/views/security/VaultPasswordManage.vue'),
    meta: { title: '保险库密码', requiresAuth: true },
  },
  {
    path: '/security-manage/vault/setup',
    name: 'SecurityVaultSetup',
    component: () => import('@/views/vault/VaultSetup.vue'),
    meta: { title: '开通保险库', requiresAuth: true, backTo: '/security-manage/vault' },
  },
  {
    path: '/security-manage/vault/change',
    name: 'SecurityVaultChange',
    component: () => import('@/views/security/VaultChangePassword.vue'),
    meta: { title: '修改保险库密码', requiresAuth: true },
  },
  {
    path: '/security-manage/vault/recovery',
    name: 'SecurityVaultRecovery',
    component: () => import('@/views/vault/VaultRecovery.vue'),
    meta: { title: '密码恢复', requiresAuth: true, backTo: '/security-manage/vault' },
  },
  {
    path: '/security-manage/vault/new-password',
    name: 'SecurityVaultNewPassword',
    component: () => import('@/views/vault/VaultNewPassword.vue'),
    meta: { title: '设置新密码', requiresAuth: true, backTo: '/security-manage/vault' },
  },
  {
    path: '/security-manage/folders',
    name: 'FolderPasswordManage',
    component: () => import('@/views/security/FolderPasswordManage.vue'),
    meta: { title: '加密文件夹', requiresAuth: true },
  },
  {
    path: '/security-manage/folders/:id',
    name: 'FolderPasswordForm',
    component: () => import('@/views/security/FolderPasswordForm.vue'),
    meta: { title: '文件夹密码', requiresAuth: true },
  },
  {
    path: '/secret-room',
    name: 'SecretRoom',
    component: () => import('@/views/SecretRoom.vue'),
    meta: { title: 'Secret Room', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/secret-room/setup',
    name: 'VaultSetup',
    component: () => import('@/views/vault/VaultSetup.vue'),
    meta: { title: '开通保险库', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/secret-room/unlock',
    name: 'VaultUnlock',
    component: () => import('@/views/vault/VaultUnlock.vue'),
    meta: { title: '解锁保险库', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/secret-room/vault',
    name: 'VaultHome',
    component: () => import('@/views/vault/VaultHome.vue'),
    meta: { title: '文件保险库', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/secret-room/recovery',
    name: 'VaultRecovery',
    component: () => import('@/views/vault/VaultRecovery.vue'),
    meta: { title: '密码恢复', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/secret-room/new-password',
    name: 'VaultNewPassword',
    component: () => import('@/views/vault/VaultNewPassword.vue'),
    meta: { title: '设置新密码', requiresAuth: true, secretRoom: true },
  },
  {
    path: '/admin/recovery',
    name: 'AdminRecovery',
    component: () => import('@/views/admin/AdminRecovery.vue'),
    meta: { title: '恢复审核', requiresAuth: true, admin: true },
  },
  {
    path: '/user',
    name: 'UserCenter',
    component: () => import('@/views/UserCenter.vue'),
    meta: { title: '用户中心', requiresAuth: true },
  },
  {
    path: '/user/profile',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue'),
    meta: { title: '个人资料', requiresAuth: true },
  },
  {
    path: '/user/password',
    name: 'UserPassword',
    component: () => import('@/views/UserPassword.vue'),
    meta: { title: '修改密码', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, _from, next) => {
  const title = to.meta.title
  if (title) {
    document.title = `${title} - ${import.meta.env.VITE_APP_TITLE || '个人笔记本'}`
  }

  const token = getToken()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guest && token) {
    next({ name: 'Notebook' })
    return
  }

  if (requiresAuth && token) {
    if (to.meta.secretRoom && !isSecretRoomUnlocked()) {
      next({ name: 'Calculator' })
      return
    }

    if (to.meta.admin) {
      const userStore = useUserStore()
      try {
        if (!userStore.userInfo) {
          await userStore.fetchUserInfo()
        }
        if (!userStore.userInfo?.isAdmin) {
          next({ name: 'Notebook' })
          return
        }
      } catch {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }

    if (to.name === 'Calculator') {
      const userStore = useUserStore()
      try {
        if (!userStore.userInfo) {
          await userStore.fetchUserInfo()
        }
        if (userStore.userInfo && !userStore.userInfo.secretCodeSet) {
          next({ name: 'SecretCodeSetup' })
          return
        }
      } catch {
        /* ignore */
      }
    }

    if (to.name === 'SecretCodeReset' || to.name === 'SecuritySecretCodeReset') {
      const userStore = useUserStore()
      try {
        if (!userStore.userInfo) {
          await userStore.fetchUserInfo()
        }
        if (userStore.userInfo && !userStore.userInfo.secretCodeSet) {
          next({ name: 'SecretCodeSetup' })
          return
        }
      } catch {
        /* ignore */
      }
    }
  }

  next()
})

export default router
