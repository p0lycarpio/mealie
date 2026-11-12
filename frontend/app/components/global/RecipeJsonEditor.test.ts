import { EditorView } from "@codemirror/view";
import { undo } from "@codemirror/commands";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import RecipeJsonEditor from "./RecipeJsonEditor.vue";

const wrappers: ReturnType<typeof mount>[] = [];

function mountEditor(initial: unknown, requireObject = false, readOnly = false) {
  const model = ref(initial);
  const valid = ref(true);
  vi.stubGlobal("useTheme", () => ({ global: { current: ref({ dark: false }) } }));
  const Host = defineComponent({
    components: { RecipeJsonEditor },
    setup: () => ({ model, valid, requireObject, readOnly }),
    template: `<RecipeJsonEditor v-model="model" v-model:valid="valid" :require-object="requireObject" :read-only="readOnly" />`,
  });
  const wrapper = mount(Host, { attachTo: document.body });
  wrappers.push(wrapper);
  const view = EditorView.findFromDOM(wrapper.get(".cm-editor").element as HTMLElement);
  if (!view) {
    throw new Error("CodeMirror view was not mounted");
  }
  return { model, valid, view };
}

function replaceText(view: EditorView, text: string) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  vi.unstubAllGlobals();
});

describe("RecipeJsonEditor", () => {
  test("reports invalid text without updating the model and clears the error after correction", async () => {
    const { model, valid, view } = mountEditor({ name: "Original" });
    replaceText(view, "{\"name\":");
    await nextTick();
    expect(valid.value).toBe(false);
    expect(model.value).toEqual({ name: "Original" });
    replaceText(view, "{\"name\":\"Updated\"}");
    await nextTick();
    expect(valid.value).toBe(true);
    expect(model.value).toEqual({ name: "Updated" });
  });

  test.each([["true", true], ["null", null], ["42", 42], ["\"text\"", "text"]])(
    "accepts the valid JSON value %s",
    async (text, expected) => {
      const { model, valid, view } = mountEditor({});
      replaceText(view, text);
      await nextTick();
      expect(valid.value).toBe(true);
      expect(model.value).toEqual(expected);
    },
  );

  test("rejects non-object JSON roots when an object is required", async () => {
    const { model, valid, view } = mountEditor({ name: "Original" }, true);
    replaceText(view, "[]");
    await nextTick();
    expect(valid.value).toBe(false);
    expect(model.value).toEqual({ name: "Original" });
  });

  test("keeps the read-only editor focusable", () => {
    const { view } = mountEditor({ name: "Original" }, false, true);
    expect(view.state.readOnly).toBe(true);
    expect(view.contentDOM.getAttribute("contenteditable")).toBe("false");
    expect(view.contentDOM.tabIndex).toBe(0);
  });

  test("still allows undoing a user edit", async () => {
    const { model, view } = mountEditor({ x: 1 });
    const offset = view.state.doc.toString().indexOf("1");
    view.dispatch({ changes: { from: offset, to: offset + 1, insert: "2" } });
    await nextTick();
    undo(view);
    await nextTick();
    expect(model.value).toEqual({ x: 1 });
  });

  test("does not undo a document replacement received from the parent", async () => {
    const { model, view } = mountEditor({ name: "Original" });
    model.value = { name: "External" };
    await nextTick();
    undo(view);
    await nextTick();
    expect(JSON.parse(view.state.doc.toString())).toEqual({ name: "External" });
    expect(model.value).toEqual({ name: "External" });
  });

  test("does not apply older edits to a document replaced by the parent", async () => {
    const { model, view } = mountEditor({ x: 1 });
    const offset = view.state.doc.toString().indexOf("1");
    view.dispatch({ changes: { from: offset, to: offset + 1, insert: "2" } });
    await nextTick();
    model.value = { x: 3 };
    await nextTick();
    undo(view);
    await nextTick();
    expect(view.state.doc.toString()).toBe("{\n  \"x\": 3\n}");
    expect(model.value).toEqual({ x: 3 });
  });
});
