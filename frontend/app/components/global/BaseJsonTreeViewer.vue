<template>
  <div class="json-tree-viewer">
    <BaseJsonTreeNode :value="modelValue" />
  </div>
</template>

<script setup lang="ts">
import BaseJsonTreeNode from "./BaseJsonTreeNode.vue";

defineProps<{
  modelValue: unknown;
}>();
</script>

<style scoped>
.json-tree-viewer {
  overflow: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
