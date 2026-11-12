<template>
  <div class="json-tree-node">
    <details v-if="entries" open>
      <summary>
        <span v-if="nodeKey !== undefined">{{ nodeKey }}: </span>
        {{ Array.isArray(value) ? "[" : "{" }}{{ entries.length }}{{ Array.isArray(value) ? "]" : "}" }}
      </summary>
      <div class="json-tree-children">
        <BaseJsonTreeNode
          v-for="[key, child] in entries"
          :key="key"
          :node-key="key"
          :value="child"
        />
      </div>
    </details>
    <div v-else>
      <span v-if="nodeKey !== undefined">{{ nodeKey }}: </span>{{ JSON.stringify(value) }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: unknown;
  nodeKey?: string;
}>();

const entries = computed(() => {
  if (props.value === null || typeof props.value !== "object") {
    return null;
  }
  return Object.entries(props.value);
});
</script>

<style scoped>
.json-tree-node {
  min-width: max-content;
}

.json-tree-node summary {
  cursor: pointer;
}

.json-tree-children {
  margin-inline-start: 1.25rem;
}
</style>
