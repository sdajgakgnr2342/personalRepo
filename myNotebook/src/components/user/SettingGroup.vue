<script setup>
defineProps({
  marginTop: { type: Boolean, default: true },
})
</script>

<template>
  <section class="setting-group" :class="{ 'has-margin': marginTop }">
    <slot />
  </section>
</template>

<style scoped>
.setting-group {
  background: #fff;
  overflow: hidden;
}

.setting-group.has-margin {
  margin-top: 12px;
}

.setting-group:first-child {
  margin-top: 0;
}
</style>
