<template>
  <div>
    <div
      ref="editorElement"
      :style="{ height }"
    />
  </div>
</template>

<script setup lang="ts">
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

defineOptions({ name: "BaseJsonCodeEditor" });

const modelValue = defineModel<unknown>("modelValue", { default: () => ({}) });
const props = withDefaults(defineProps<{
  height?: string;
  readOnly?: boolean;
  ariaLabel?: string;
}>(), {
  height: "1500px",
  readOnly: false,
  ariaLabel: "JSON editor",
});

const editorElement = ref<HTMLElement>();
const readOnlyCompartment = new Compartment();
const themeCompartment = new Compartment();
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
let editorView: EditorView | undefined;
let internalText = serialize(modelValue.value);
let lastValidObject = modelValue.value;
let lastEmittedSerializedObject = serialize(modelValue.value);
let applyingExternalUpdate = false;

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "{}";
}

function parseObject(text: string): object | undefined {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === "object" && value !== null) {
      return value;
    }
  }
  catch {
    // Invalid text stays in the editor until the user corrects it.
  }
  return undefined;
}

function replaceDocument(text: string) {
  if (!editorView || text === editorView.state.doc.toString()) {
    internalText = text;
    return;
  }

  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: text,
    },
  });
}

function themeExtensions(dark: boolean) {
  return [
    dark ? oneDark : syntaxHighlighting(defaultHighlightStyle),
    highlightActiveLine(),
    highlightActiveLineGutter(),
  ];
}

onMounted(() => {
  if (!editorElement.value) {
    return;
  }

  editorView = new EditorView({
    parent: editorElement.value,
    state: EditorState.create({
      doc: internalText,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        json(),
        linter(jsonParseLinter()),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
        themeCompartment.of(themeExtensions(isDark.value)),
        readOnlyCompartment.of([
          EditorState.readOnly.of(props.readOnly),
          EditorView.editable.of(!props.readOnly),
        ]),
        EditorView.contentAttributes.of({ "aria-label": props.ariaLabel }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return;
          }

          internalText = update.state.doc.toString();
          const parsed = parseObject(internalText);
          if (!parsed || (props.readOnly && !applyingExternalUpdate)) {
            return;
          }

          lastValidObject = parsed;
          if (!applyingExternalUpdate) {
            lastEmittedSerializedObject = serialize(parsed);
            modelValue.value = lastValidObject;
          }
        }),
      ],
    }),
  });
});

watch(() => props.readOnly, (readOnly) => {
  editorView?.dispatch({
    effects: readOnlyCompartment.reconfigure([
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]),
  });
});

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

  lastValidObject = value;
  lastEmittedSerializedObject = serializedObject;
  applyingExternalUpdate = true;
  replaceDocument(serializedObject);
  applyingExternalUpdate = false;
});

onBeforeUnmount(() => {
  editorView?.destroy();
  editorView = undefined;
});
</script>
