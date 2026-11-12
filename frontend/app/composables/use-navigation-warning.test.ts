import { mount } from "@vue/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import * as navigationWarning from "./use-navigation-warning";

afterEach(() => {
  vi.restoreAllMocks();
});

test("invalid JSON blocks navigation until the user confirms discarding it", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  let guard: ReturnType<typeof navigationWarning.useJsonEditorGuard>;
  let routeGuard: () => boolean;
  vi.stubGlobal("onBeforeRouteLeave", (callback: () => boolean) => { routeGuard = callback; });
  const EditorPage = defineComponent({
    setup() {
      guard = navigationWarning.useJsonEditorGuard();
      return () => h("div", "Editor");
    },
  });
  const wrapper = mount(EditorPage);
  guard!.valid.value = false;
  await nextTick();

  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);

  expect(routeGuard!()).toBe(false);

  confirm.mockReturnValue(true);
  expect(routeGuard!()).toBe(true);
  wrapper.unmount();
  vi.unstubAllGlobals();
});
