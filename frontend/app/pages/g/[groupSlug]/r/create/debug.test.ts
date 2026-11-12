import { mount } from "@vue/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { nextTick, ref } from "vue";
import DebugPage from "./debug.vue";

vi.mock("~/composables/api", () => ({
  useUserApi: () => ({
    recipes: { testCreateOneUrl: async () => ({ data: { name: "Example", nested: { count: 2 } } }) },
  }),
}));

vi.mock("~/composables/use-groups", () => ({
  useGroupSelf: () => ({ group: ref(null) }),
}));

afterEach(() => vi.unstubAllGlobals());

test("the debugger can switch between JSON text and an expandable tree", async () => {
  vi.stubGlobal("useRoute", () => ({ query: { recipe_import_url: "https://example.com" } }));
  vi.stubGlobal("useRouter", () => ({ replace: vi.fn() }));
  const wrapper = mount(DebugPage, {
    global: {
      mocks: { $globals: { icons: {} } },
      stubs: {
        VForm: { template: "<form><slot /></form>" },
        VCardTitle: { template: "<div><slot /></div>" },
        VCardText: { template: "<div><slot /></div>" },
        VCardActions: { template: "<div><slot /></div>" },
        VTextField: true,
        BaseButton: { template: "<button><slot /></button>" },
        VCheckbox: {
          props: ["modelValue"],
          template: `<button class="tree-toggle" @click="$emit('update:modelValue', !modelValue)"><slot /></button>`,
        },
        LazyRecipeJsonEditor: { template: "<div class='text-editor' />" },
      },
    },
  });
  await wrapper.get("form").trigger("submit");
  await nextTick();
  expect(wrapper.find(".text-editor").exists()).toBe(true);
  await wrapper.get(".tree-toggle").trigger("click");
  expect(wrapper.find(".text-editor").exists()).toBe(false);
  expect(wrapper.text()).toContain("Example");
  expect(wrapper.text()).toContain("count");
  expect(wrapper.find("details").exists()).toBe(true);
  wrapper.unmount();
});
