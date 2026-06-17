<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  arrow: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
  border: { type: Boolean, default: true },
  as: { type: String, default: 'button' },
})

const emit = defineEmits(['click'])
</script>

<template>
  <component
    :is="as === 'div' ? 'div' : 'button'"
    type="button"
    class="setting-cell"
    :class="{ danger, 'no-border': !border }"
    @click="as !== 'div' && emit('click')"
  >
    <span class="cell-label">{{ label }}</span>
    <span class="cell-right">
      <span v-if="value" class="cell-value">{{ value }}</span>
      <span v-if="arrow" class="cell-arrow" aria-hidden="true">›</span>
      <slot name="extra" />
    </span>
  </component>
</template>

<style scoped>
.setting-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: none;
  border-bottom: 1px solid #ededed;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.setting-cell.no-border {
  border-bottom: none;
}

.setting-cell:active {
  background: #ececec;
}

.cell-label {
  flex-shrink: 0;
  font-size: 16px;
  color: #191919;
}

.cell-right {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-left: auto;
}

.cell-value {
  font-size: 15px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-arrow {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
  color: #c7c7cc;
  font-weight: 300;
}

.setting-cell.danger .cell-label {
  color: #fa5151;
  width: 100%;
  text-align: center;
}

.setting-cell.danger .cell-right {
  display: none;
}
</style>
