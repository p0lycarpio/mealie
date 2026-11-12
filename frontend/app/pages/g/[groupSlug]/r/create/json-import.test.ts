import { mount } from "@vue/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { ref } from "vue";
import AiPage from "./ai.vue";
import HtmlPage from "./html.vue";

const api = vi.hoisted(() => ({
  createOneByHtmlOrJson: vi.fn(),
  createOneWithAI: vi.fn(),
}));

vi.mock("~/composables/api", () => ({ useUserApi: () => ({ recipes: api }) }));
vi.mock("~/composables/use-groups", () => ({
  useGroupSelf: () => ({ group: ref({ aiProviderSettings: { aiEnabled: true } }) }),
}));
vi.mock("~/composables/store/use-tag-store", () => ({
  useTagStore: () => ({ actions: { refresh: vi.fn() } }),
}));
vi.mock("~/composables/use-new-recipe-options", () => ({
  useNewRecipeOptions: () => ({
    importKeywordsAsTags: ref(false),
    importCategories: ref(false),
    stayInEditMode: ref(false),
    parseRecipe: ref(false),
    translateRecipe: ref(false),
    createNewOrganizers: ref(false),
    navigateToRecipe: vi.fn(),
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test.each([
  ["HTML", HtmlPage, api.createOneByHtmlOrJson],
  ["AI", AiPage, api.createOneWithAI],
] as const)("%s import prevents submission and mode switching with invalid JSON", async (_, page, submit) => {
  vi.stubGlobal("useRoute", () => ({ params: { groupSlug: "family" } }));
  vi.stubGlobal("useMealieAuth", () => ({ user: ref({ groupSlug: "family" }) }));
  vi.stubGlobal("onBeforeRouteLeave", vi.fn());
  vi.stubGlobal("definePageMeta", vi.fn());
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  api.createOneByHtmlOrJson.mockResolvedValue({ response: null });
  api.createOneWithAI.mockResolvedValue({ data: null, error: { message: "Failed" } });

  const wrapper = mount(page, {
    global: {
      mocks: { $globals: { icons: {} } },
      stubs: {
        VForm: { template: "<form><slot /></form>", methods: { validate: async () => ({ valid: true }) } },
        VSwitch: {
          props: ["modelValue"],
          template: `<button class="json-switch" type="button" @click="$emit('update:modelValue', !modelValue)" />`,
        },
        LazyRecipeJsonEditor: {
          template: `<div>
            <button class="invalid-json" type="button" @click="$emit('update:valid', false)" />
            <button class="false-json" type="button" @click="$emit('update:modelValue', false)" />
          </div>`,
        },
        BaseButton: { template: "<button type='submit' :disabled='$attrs.disabled'><slot /></button>" },
        VTextarea: { template: "<textarea />" },
        VCard: { template: "<div><slot /></div>" },
        VCardText: { template: "<div><slot /></div>" },
        VCardTitle: { template: "<div><slot /></div>" },
        VCardActions: { template: "<div><slot /></div>" },
        VTextField: true,
        VCheckbox: true,
        VAlert: true,
        VDivider: true,
        VIcon: true,
        VTooltip: true,
        RecipeImportImages: true,
        VExpandTransition: { template: "<div><slot /></div>" },
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });

  await wrapper.get(".json-switch").trigger("click");
  await wrapper.get(".invalid-json").trigger("click");
  expect(wrapper.get("button[type=submit]").attributes("disabled")).toBeDefined();
  await wrapper.get("form").trigger("submit");
  expect(submit).not.toHaveBeenCalled();

  await wrapper.get(".json-switch").trigger("click");
  expect(wrapper.find(".invalid-json").exists()).toBe(true);
  confirm.mockReturnValue(true);
  await wrapper.get(".json-switch").trigger("click");
  expect(wrapper.find("textarea").exists()).toBe(true);

  await wrapper.get(".json-switch").trigger("click");
  await wrapper.get(".false-json").trigger("click");
  await wrapper.get("form").trigger("submit");
  if (page === HtmlPage) {
    expect(submit).toHaveBeenCalledWith("false", false, false, null, expect.any(Function));
  }
  else {
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ content: "false" }), expect.any(Function));
  }
  wrapper.unmount();
});
