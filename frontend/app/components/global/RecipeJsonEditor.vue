<template>
  <div ref="editorElement" :style="{ height }" class="codemirror-wrapper" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { search } from "@codemirror/search";
import { json } from "@codemirror/lang-json";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { basicSetup } from "codemirror";
import { tags as t } from "@lezer/highlight";
import { useDark } from "@vueuse/core";

interface Props {
  modelValue?: Record<string, any>;
  height?: string;
  readOnly?: boolean;
}

interface Emits {
  (e: "update:modelValue", value: Record<string, any>): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  height: "1000px",
  readOnly: false,
});

const emit = defineEmits<Emits>();

const isDark = useDark();
const editorElement = ref<HTMLElement>();
let editorView: EditorView | null = null;

// JSON utilities
const formatJson = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
};

const parseJson = (text: string): Record<string, any> => {
  try {
    return JSON.parse(text);
  } catch {
    return props.modelValue || {};
  }
};

// Color themes
const lightTheme = [
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: "#cf59f2" },
      { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#d25861" },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#ffa600" },
      {
        tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
        color: "#ffa600",
      },
      {
        tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
        color: "#619d36",
      },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#61afef" },
      { tag: [t.processingInstruction, t.string, t.inserted], color: "#619d36" },
      { tag: [t.punctuation, t.bracket, t.squareBracket, t.paren, t.brace], color: "#68696e" },
      { tag: t.invalid, color: "#ffffff", backgroundColor: "#e06c75" },
    ])
  ),
];

const darkTheme = [
  EditorView.theme({
    "&": {
      backgroundColor: "rgb(var(--v-theme-surface))",
    },
    ".cm-content": {
      caretColor: "white",
    },
    ".cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#264f78",
    },
    ".cm-gutters": {
      backgroundColor: "rgb(25, 25, 25)",
      color: "#abb2bf",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#2c313c",
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: "#c694d5" },
      { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#e06c75" },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#ffa600" },
      {
        tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
        color: "#e5c07b",
      },
      {
        tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
        color: "#56b6c2",
      },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#61afef" },
      { tag: [t.processingInstruction, t.string, t.inserted], color: "#98c379" },
      { tag: [t.punctuation, t.bracket, t.squareBracket, t.paren, t.brace], color: "#abb2bf" },
      { tag: [t.meta, t.comment], color: "#5c6370", fontStyle: "italic" },
      { tag: t.invalid, color: "#ffffff", backgroundColor: "#e06c75" },
    ])
  ),
];

const baseExtensions = [basicSetup, EditorView.lineWrapping, search({ top: true }), json()];

const createEditor = () => {
  if (!editorElement.value) return;

  const extensions = [
    ...baseExtensions,
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !props.readOnly) {
        const text = update.state.doc.toString();
        const parsed = parseJson(text);
        emit("update:modelValue", parsed);
      }
    }),
    ...(isDark.value ? darkTheme : lightTheme),
  ];

  if (props.readOnly) {
    extensions.push(EditorState.readOnly.of(true));
  }

  const initialValue = formatJson(props.modelValue);

  editorView = new EditorView({
    state: EditorState.create({
      doc: initialValue,
      extensions,
    }),
    parent: editorElement.value,
  });
};

const updateEditor = (newValue: any) => {
  if (!editorView || props.readOnly) return;

  const formattedValue = formatJson(newValue);
  const currentValue = editorView.state.doc.toString();

  if (formattedValue !== currentValue) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: formattedValue,
      },
    });
  }
};

onMounted(() => {
  createEditor();
});

onUnmounted(() => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});

watch(
  () => props.modelValue,
  (newValue) => {
    updateEditor(newValue);
  },
  { deep: true }
);

watch(
  () => isDark.value,
  () => {
    // Recreate editor when theme changes
    if (editorView) {
      editorView.destroy();
      createEditor();
    }
  }
);
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
}
</style>
