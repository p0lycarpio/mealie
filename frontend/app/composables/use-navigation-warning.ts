export function useNavigationWarning() {
  return { activateNavigationWarning, deactivateNavigationWarning };
}

export function useJsonEditorGuard() {
  const valid = ref(true);
  const { t } = useI18n();

  function confirmDiscard() {
    return valid.value || window.confirm(t("recipe.discard-invalid-json"));
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!valid.value) {
      event.preventDefault();
    }
  }

  onBeforeRouteLeave(() => confirmDiscard());
  onMounted(() => window.addEventListener("beforeunload", beforeUnload));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));

  return { valid, confirmDiscard };
}

/**
 * Displays a warning before the user navigates to another page
 * e.g., by clicking a link (which isn't internal and rendered without page load),
 * reloading the page,
 * or closing the tab.
 */
const activateNavigationWarning = () => {
  window.onbeforeunload = () => true;
};

/**
 * Disables the warning when navigating to a page
 */
const deactivateNavigationWarning = () => {
  window.onbeforeunload = null;
};
