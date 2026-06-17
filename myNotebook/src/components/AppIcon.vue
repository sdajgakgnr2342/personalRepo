<script setup>
import { computed } from 'vue'
import { icons } from '@/utils/icons'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  alt: { type: String, default: '' },
})

const src = computed(() => icons[props.name])
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt || name"
    class="app-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    draggable="false"
  />
</template>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
