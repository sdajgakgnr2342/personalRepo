<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  hint: { type: String, default: '' },
  /** lg 主内容区 | md 列表区 | sm 侧栏 | inline 横向条 */
  size: {
    type: String,
    default: 'lg',
    validator: (v) => ['lg', 'md', 'sm', 'inline'].includes(v),
  },
  fill: { type: Boolean, default: false },
})

const iconSize = computed(() => {
  const map = { lg: 72, md: 56, sm: 36, inline: 28 }
  return map[props.size] || 72
})
</script>

<template>
  <div class="empty-state" :class="[`empty-state--${size}`, { 'empty-state--fill': fill }]">
    <div class="empty-state-body">
      <div class="empty-state-icon" aria-hidden="true">
        <AppIcon name="clipboard" :size="iconSize" alt="" />
      </div>
      <div class="empty-state-text">
        <p v-if="title" class="empty-state-title">{{ title }}</p>
        <p v-if="description" class="empty-state-desc">{{ description }}</p>
        <p v-if="hint" class="empty-state-hint">{{ hint }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
}

.empty-state--fill {
  flex: 1;
  min-height: 0;
}

.empty-state-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 300px;
}

.empty-state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 50%;
  background: linear-gradient(145deg, #f8fafc 0%, #eef2f7 100%);
  opacity: 0.92;
}

.empty-state--lg .empty-state-icon {
  width: 104px;
  height: 104px;
  margin-bottom: 18px;
}

.empty-state--md .empty-state-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 14px;
}

.empty-state--sm .empty-state-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 10px;
}

.empty-state--inline {
  padding: 10px 8px;
  justify-content: flex-start;
  text-align: left;
}

.empty-state--inline .empty-state-body {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  max-width: none;
  width: 100%;
}

.empty-state--inline .empty-state-icon {
  width: 44px;
  height: 44px;
  margin-bottom: 0;
  flex-shrink: 0;
}

.empty-state--sm {
  padding: 20px 16px;
}

.empty-state--md {
  padding: 28px 20px;
}

.empty-state-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: #475569;
  line-height: 1.4;
}

.empty-state--lg .empty-state-title {
  font-size: 17px;
}

.empty-state--md .empty-state-title {
  font-size: 15px;
}

.empty-state--sm .empty-state-title,
.empty-state--inline .empty-state-title {
  font-size: 13px;
  margin-bottom: 2px;
}

.empty-state-desc {
  margin: 0 0 4px;
  color: #94a3b8;
  line-height: 1.55;
}

.empty-state--lg .empty-state-desc {
  font-size: 14px;
}

.empty-state--md .empty-state-desc {
  font-size: 13px;
}

.empty-state--sm .empty-state-desc,
.empty-state--inline .empty-state-desc {
  font-size: 12px;
}

.empty-state-hint {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.5;
}

.empty-state--lg .empty-state-hint {
  font-size: 12px;
}

.empty-state--md .empty-state-hint {
  font-size: 12px;
}

.empty-state--sm .empty-state-hint,
.empty-state--inline .empty-state-hint {
  font-size: 11px;
}

.empty-state--inline .empty-state-text {
  min-width: 0;
}
</style>
