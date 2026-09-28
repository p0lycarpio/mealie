<template>
  <div class="json-tree-node">
    <template v-if="kind === 'object' || kind === 'array'">
      <details open>
        <summary>
          <span v-if="nodeKey !== undefined" class="json-key">{{ nodeKey }}: </span>
          <span class="json-collection">
            {{ kind === "array" ? `Array(${entries.length})` : `Object (${entries.length})` }}
          </span>
        </summary>
        <div v-if="entries.length" class="json-children">
          <BaseJsonTreeNode
            v-for="entry in entries"
            :key="entry.key"
            :node-key="entry.key"
            :value="entry.value"
            :ancestors="[...ancestors, collectionValue]"
          />
        </div>
        <div v-else class="json-empty">
          {{ kind === "array" ? "Empty array" : "Empty object" }}
        </div>
      </details>
    </template>

    <div v-else>
      <span v-if="nodeKey !== undefined" class="json-key">{{ nodeKey }}: </span>
      <span
        v-if="kind === 'null'"
        data-json-type="null"
        class="json-null"
      >
        null <span class="json-type">null</span>
      </span>
      <span
        v-else-if="kind === 'string'"
        data-json-type="string"
        class="json-string"
      >
        {{ JSON.stringify(value) }} <span class="json-type">string</span>
      </span>
      <span
        v-else-if="kind === 'number'"
        data-json-type="number"
        class="json-number"
      >
        {{ value }} <span class="json-type">number</span>
      </span>
      <span
        v-else-if="kind === 'boolean'"
        data-json-type="boolean"
        class="json-boolean"
      >
        {{ value }} <span class="json-type">boolean</span>
      </span>
      <span v-else class="json-unsupported">
        {{ kind === "circular" ? "Circular reference" : "Unsupported value" }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type JsonNodeKind = "array" | "boolean" | "circular" | "null" | "number" | "object" | "string" | "unsupported";

interface JsonEntry {
  key: string;
  value: unknown;
}

const props = withDefaults(defineProps<{
  value: unknown;
  nodeKey?: string;
  ancestors?: readonly object[];
}>(), {
  nodeKey: undefined,
  ancestors: () => [],
});

const analysis = computed<{ kind: JsonNodeKind; entries: JsonEntry[] }>(() => {
  if (props.value === null) {
    return { kind: "null", entries: [] };
  }

  if (typeof props.value === "string" || typeof props.value === "boolean") {
    return { kind: typeof props.value, entries: [] };
  }

  if (typeof props.value === "number") {
    return { kind: Number.isFinite(props.value) ? "number" : "unsupported", entries: [] };
  }

  if (typeof props.value !== "object") {
    return { kind: "unsupported", entries: [] };
  }

  if (props.ancestors.includes(props.value)) {
    return { kind: "circular", entries: [] };
  }

  try {
    const isArray = Array.isArray(props.value);
    if (!isArray) {
      const prototype = Object.getPrototypeOf(props.value);
      if (prototype !== Object.prototype && prototype !== null) {
        return { kind: "unsupported", entries: [] };
      }
    }

    const entries = Object.entries(props.value).map(([key, value]) => ({ key, value }));
    return { kind: isArray ? "array" : "object", entries };
  }
  catch {
    return { kind: "unsupported", entries: [] };
  }
});

const kind = computed(() => analysis.value.kind);
const entries = computed(() => analysis.value.entries);
const collectionValue = computed(() => props.value as object);
</script>

<style scoped>
.json-tree-node {
  min-width: max-content;
}

.json-tree-node summary {
  cursor: pointer;
  user-select: none;
}

.json-children,
.json-empty {
  margin-inline-start: 1.25rem;
}

.json-key {
  color: rgb(var(--v-theme-primary));
}

.json-collection,
.json-type,
.json-empty {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.65;
}

.json-type {
  margin-inline-start: 0.35rem;
  font-size: 0.75rem;
}

.json-string {
  color: rgb(var(--v-theme-success));
}

.json-number,
.json-boolean {
  color: rgb(var(--v-theme-info));
}

.json-null,
.json-unsupported {
  color: rgb(var(--v-theme-error));
}
</style>
