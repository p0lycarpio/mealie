import { shallowMount } from "@vue/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { nextTick, ref } from "vue";
import RecipePage from "./RecipePage.vue";

const updateOne = vi.hoisted(() => vi.fn());
const blankComponent = vi.hoisted(() => ({ default: { template: "<div />" } }));

vi.mock("../RecipeIngredients.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageEditorToolbar.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageFooter.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageHeader.vue", () => ({
  default: {
    name: "RecipePageHeader",
    template: `<div>
      <button class="save" @click="$emit('save')" />
      <button class="close" @click="$emit('close')" />
    </div>`,
  },
}));
vi.mock("./RecipePageParts/RecipePageIngredientEditor.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageIngredientToolsView.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageInstructions.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageOrganizers.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipeParseDialog/RecipePageParseDialog.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageScale.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageInfoEditor.vue", () => blankComponent);
vi.mock("./RecipePageParts/RecipePageComments.vue", () => blankComponent);
vi.mock("~/components/Domain/Recipe/RecipePrintContainer.vue", () => blankComponent);
vi.mock("~/components/Domain/Recipe/RecipeDialogBulkAdd.vue", () => blankComponent);
vi.mock("~/components/Domain/Recipe/RecipeNotes.vue", () => blankComponent);

vi.mock("~/composables/api", () => ({ useUserApi: () => ({ recipes: { updateOne } }) }));
vi.mock("~/composables/use-logged-in-state", () => ({
  useLoggedInState: () => ({ isOwnGroup: ref(true) }),
}));
vi.mock("~/composables/use-households", () => ({
  useHouseholdSelf: () => ({ household: ref(null) }),
}));
vi.mock("~/composables/recipes", () => ({
  useUnitSystem: () => ({ unitSystem: ref(null) }),
  useUnitConversion: () => ({ convertIngredient: vi.fn() }),
}));
vi.mock("~/composables/use-router", () => ({ useRouteQuery: () => ref("") }));
vi.mock("~/composables/recipe-page/shared-state", () => ({
  PageMode: { VIEW: "VIEW", EDIT: "EDIT", COOK: "COOK" },
  clearPageState: vi.fn(),
  usePageState: () => ({
    pageMode: ref("EDIT"),
    setMode: vi.fn(),
    isEditForm: ref(false),
    isEditJSON: ref(true),
    isCookMode: ref(false),
    isEditMode: ref(true),
    isParsing: ref(false),
    toggleCookMode: vi.fn(),
    toggleEditMode: vi.fn(),
    toggleIsParsing: vi.fn(),
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("invalid recipe JSON blocks saving and opens the discard dialog on close", async () => {
  vi.stubGlobal("useDisplay", () => ({ smAndDown: ref(false), smAndUp: ref(true) }));
  vi.stubGlobal("useMealieAuth", () => ({ user: ref({ groupSlug: "family" }) }));
  vi.stubGlobal("useRoute", () => ({ params: { groupSlug: "family", slug: "recipe" } }));
  vi.stubGlobal("useRouter", () => ({ push: vi.fn(), replace: vi.fn() }));
  const registerRouteGuard = vi.fn();
  vi.stubGlobal("onBeforeRouteLeave", registerRouteGuard);
  vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    disconnect() {}
  });

  const wrapper = shallowMount(RecipePage, {
    props: {
      modelValue: {
        id: "1",
        userId: "user",
        householdId: "household",
        groupId: "group",
        name: "Recipe",
        slug: "recipe",
        image: "",
        recipeServings: 1,
        recipeYieldQuantity: 1,
        recipeYield: "",
        totalTime: "",
        prepTime: "",
        cookTime: "",
        performTime: "",
        totalTimeSeconds: 0,
        prepTimeSeconds: 0,
        performTimeSeconds: 0,
        description: "",
        recipeCategory: [],
        tags: [],
        tools: [],
        rating: 0,
        orgURL: "",
        dateAdded: "",
        dateUpdated: "",
        createdAt: "",
        updatedAt: "",
        lastMade: "",
        recipeIngredient: [],
        recipeInstructions: [],
        nutrition: {
          calories: "",
          carbohydrateContent: "",
          cholesterolContent: "",
          fatContent: "",
          fiberContent: "",
          proteinContent: "",
          saturatedFatContent: "",
          sodiumContent: "",
          sugarContent: "",
          transFatContent: "",
          unsaturatedFatContent: "",
        },
        settings: {
          public: false,
          showNutrition: false,
          showAssets: false,
          landscapeView: false,
          disableComments: false,
          locked: false,
        },
        assets: [],
        notes: [],
        extras: {},
        comments: [],
      },
    },
    global: {
      mocks: { $globals: { icons: {} }, $vuetify: { display: { smAndDown: false, mdAndUp: true, smAndUp: true } } },
      stubs: {
        VContainer: { template: "<div><slot /></div>" },
        VCard: { template: "<div><slot /></div>" },
        VCardText: { template: "<div><slot /></div>" },
        VCardTitle: true,
        VCol: true,
        VRow: true,
        VIcon: true,
        VTooltip: true,
        VFab: true,
        VDivider: true,
        VSheet: true,
        VBtn: true,
        BaseButton: true,
        WakelockSwitch: true,
        RecipePageHeader: {
          template: `<div>
            <button class="save" @click="$emit('save')" />
            <button class="close" @click="$emit('close')" />
            <button class="json" @click="$emit('json')" />
          </div>`,
        },
        LazyRecipeJsonEditor: {
          template: `<button class="invalid-json" @click="$emit('update:valid', false)" />`,
        },
        BaseDialog: {
          props: ["modelValue"],
          template: `<div v-if="modelValue" class="discard-dialog"><slot /></div>`,
        },
      },
    },
  });
  await wrapper.get(".invalid-json").trigger("click");
  await wrapper.get(".save").trigger("click");
  expect(updateOne).not.toHaveBeenCalled();
  await wrapper.get(".json").trigger("click");
  expect(wrapper.find(".invalid-json").exists()).toBe(true);
  const routeGuard = registerRouteGuard.mock.calls[0]?.[0];
  expect(routeGuard({ path: "/other" })).toBe(false);
  await nextTick();
  expect(wrapper.find(".discard-dialog").exists()).toBe(true);
  await wrapper.get(".close").trigger("click");
  expect(wrapper.find(".discard-dialog").exists()).toBe(true);
  wrapper.unmount();
});
