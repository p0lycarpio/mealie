<template>
  <div>
    <div ref="editorElement" :style="{ height }" class="codemirror-wrapper" />
    <div v-if="validationError" class="text-error mt-2" role="alert">
      {{ $t(validationError === "root" ? "recipe.json-object-required" : "recipe.invalid-json") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

defineOptions({ name: "RecipeJsonEditor" });

const modelValue = defineModel<unknown>("modelValue", { default: () => ({}) });
const valid = defineModel<boolean>("valid", { default: true });
const props = withDefaults(
  defineProps<{
    height?: string;
    readOnly?: boolean;
    requireObject?: boolean;
  }>(),
  {
    height: "1500px",
    readOnly: false,
    requireObject: false,
  },
);

const editorElement = ref<HTMLElement>();
const readOnlyCompartment = new Compartment();
const themeCompartment = new Compartment();
const historyCompartment = new Compartment();
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
let editorView: EditorView | undefined;
let internalText = serialize(modelValue.value);
let lastEmittedSerializedObject = serialize(modelValue.value);
let applyingExternalUpdate = false;
const validationError = ref<"syntax" | "root" | null>(null);

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "{}";
}

function parseDocument(text: string): { valid: true; value: unknown } | { valid: false } {
  try {
    const value: unknown = JSON.parse(text);
    if (props.requireObject && (typeof value !== "object" || value === null || Array.isArray(value))) {
      validationError.value = "root";
      valid.value = false;
      return { valid: false };
    }
    validationError.value = null;
    valid.value = true;
    return { valid: true, value };
  }
  catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    validationError.value = "syntax";
    valid.value = false;
    return { valid: false };
  }
}

function replaceDocument(text: string) {
  if (!editorView || text === editorView.state.doc.toString()) {
    internalText = text;
    return;
  }

  editorView.dispatch({ effects: historyCompartment.reconfigure([]) });
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: text,
    },
    effects: historyCompartment.reconfigure(history()),
    annotations: Transaction.addToHistory.of(false),
  });
}

function themeExtensions(dark: boolean) {
  return [
    dark ? oneDark : syntaxHighlighting(defaultHighlightStyle),
    highlightActiveLine(),
    highlightActiveLineGutter(),
  ];
}

function readOnlyExtensions(readOnly: boolean) {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of(readOnly ? { tabindex: "0" } : {}),
  ];
}

onMounted(() => {
  if (!editorElement.value) {
    return;
  }

  parseDocument(internalText);
  editorView = new EditorView({
    parent: editorElement.value,
    state: EditorState.create({
      doc: internalText,
      extensions: [
        lineNumbers(),
        EditorView.lineWrapping,
        historyCompartment.of(history()),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        json(),
        linter(jsonParseLinter()),
        themeCompartment.of(themeExtensions(isDark.value)),
        readOnlyCompartment.of(readOnlyExtensions(props.readOnly)),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return;
          }

          internalText = update.state.doc.toString();
          const parsed = parseDocument(internalText);
          if (!parsed.valid || (props.readOnly && !applyingExternalUpdate)) {
            return;
          }

          if (!applyingExternalUpdate) {
            lastEmittedSerializedObject = serialize(parsed.value);
            modelValue.value = parsed.value;
          }
        }),
      ],
    }),
  });
});

watch(
  () => props.readOnly,
  (readOnly) => {
    editorView?.dispatch({
      effects: readOnlyCompartment.reconfigure(readOnlyExtensions(readOnly)),
    });
  },
);

watch(isDark, (dark) => {
  editorView?.dispatch({
    effects: themeCompartment.reconfigure(themeExtensions(dark)),
  });
});

watch(modelValue, (value) => {
  const serializedObject = serialize(value);
  if (serializedObject === lastEmittedSerializedObject) {
    return;
  }

  lastEmittedSerializedObject = serializedObject;
  applyingExternalUpdate = true;
  try {
    replaceDocument(serializedObject);
  }
  finally {
    applyingExternalUpdate = false;
  }
});

onBeforeUnmount(() => {
  editorView?.destroy();
  editorView = undefined;
});
</script>

<style scoped>
.codemirror-wrapper {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  font-size: 14px;
}

.codemirror-wrapper :deep(.cm-editor) {
  height: 100%;
  background-color: var(--v-theme-surface);
}
</style>
