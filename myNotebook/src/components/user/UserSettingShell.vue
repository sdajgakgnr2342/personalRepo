<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  backTo: { type: String, default: '/user' },
})

const router = useRouter()

function goBack() {
  router.push(props.backTo)
}
</script>

<template>
  <div class="setting-shell">
    <header class="setting-nav">
      <button type="button" class="nav-back" @click="goBack">
        <AppIcon name="back" :size="18" alt="返回" />
      </button>
      <h1 class="nav-title">{{ title }}</h1>
      <span class="nav-placeholder" />
    </header>
    <main class="setting-body">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.setting-shell {
  min-height: 100vh;
  background: #ededed;
}

.setting-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  height: 48px;
  padding: 0 8px;
  background: #ededed;
  border-bottom: 1px solid #dcdcdc;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
}

.nav-back:active {
  background: rgba(0, 0, 0, 0.06);
}

.nav-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #191919;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-placeholder {
  width: 36px;
}

.setting-body {
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 0 32px;
}
</style>
