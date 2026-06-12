<script setup>
import FolderTreeNode from './FolderTreeNode.vue'

defineProps({
  nodes: { type: Array, default: () => [] },
  activeId: { type: Number, default: null },
})

const emit = defineEmits(['select', 'unlock', 'create-folder', 'create-note', 'delete-item', 'context-menu'])
</script>

<template>
  <ul class="tree-root">
    <FolderTreeNode
      v-for="node in nodes"
      :key="node.id"
      :node="node"
      :active-id="activeId"
      @select="(id) => emit('select', id)"
      @unlock="(node) => emit('unlock', node)"
      @create-folder="(payload) => emit('create-folder', payload)"
      @create-note="(payload) => emit('create-note', payload)"
      @delete-item="(payload) => emit('delete-item', payload)"
      @context-menu="(e, payload) => emit('context-menu', e, payload)"
    />
  </ul>
</template>

<style scoped>
.tree-root {
  list-style: none;
  padding: 2px 0 4px 12px;
  margin: 0;
}
</style>
