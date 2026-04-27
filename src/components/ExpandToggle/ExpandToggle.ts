import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExpandController, ExpandToggleProps } from './ExpandToggle.d';

const isToggleKey = (key: string): boolean => key === 'Enter' || key === ' ';



const controllers = new Map<string, ExpandController>();
const groupCounts = ref<Record<string, number>>({});

const getGroupTargetIds = (groupId: string): string[] => (
  Array.from(controllers.values())
    .filter((controller) => controller.groupId === groupId)
    .map((controller) => controller.targetId)
);

const setGroupCount = (groupId: string): void => {
  const nextCounts = { ...groupCounts.value };
  nextCounts[groupId] = getGroupTargetIds(groupId)
    .filter((targetId) => controllers.get(targetId)?.rootElement.value?.classList.contains('expand-toggle--expanded'))
    .length;
  groupCounts.value = nextCounts;
};

const getHostElement = (controller: ExpandController): HTMLElement | null =>
  controller.rootElement.value?.closest('[data-expand-host]') as HTMLElement | null;

const setTargetState = (targetId: string, expanded: boolean): void => {
  const target = typeof document === 'undefined'
    ? null
    : document.getElementById(targetId);

  if (!target) {
    return;
  }

  target.classList.toggle('expand-toggle-target--collapsed', !expanded);
  target.classList.toggle('expand-toggle-target--expanded', expanded);
  target.toggleAttribute('hidden', !expanded);
};

const setTriggerState = (targetId: string, expanded: boolean): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.querySelectorAll<HTMLElement>(`[data-expand-target="${targetId}"]`).forEach((element) => {
    element.setAttribute('aria-expanded', String(expanded));
  });
};

const syncAccordionClasses = (groupId: string): void => {
  const groupControllers = Array.from(controllers.values())
    .filter((controller) => controller.groupId === groupId && controller.groupMode === 'accordion')
    .sort((left, right) => {
      const leftElement = getHostElement(left);
      const rightElement = getHostElement(right);

      if (!leftElement || !rightElement || leftElement === rightElement) {
        return 0;
      }

      return leftElement.compareDocumentPosition(rightElement) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  const expandedIndex = groupControllers.findIndex((controller) => (
    controller.rootElement.value?.classList.contains('expand-toggle--expanded')
  ));

  groupControllers.forEach((controller, index) => {
    const hostElement = getHostElement(controller);

    if (!hostElement) {
      return;
    }

    hostElement.classList.toggle('expand-toggle-host--before-expanded', expandedIndex !== -1 && index < expandedIndex);
    hostElement.classList.toggle('expand-toggle-host--expanded', expandedIndex === index);
    hostElement.classList.toggle('expand-toggle-host--after-expanded', expandedIndex !== -1 && index > expandedIndex);
  });
};

const applyExpandedState = (targetId: string, expanded: boolean): void => {
  const controller = controllers.get(targetId);

  if (!controller) {
    return;
  }

  controller.rootElement.value?.classList.toggle('expand-toggle--expanded', expanded);
  controller.rootElement.value?.classList.toggle('expand-toggle--collapsed', !expanded);
  getHostElement(controller)?.classList.toggle('expand-toggle-host--expanded', expanded);
  setTargetState(targetId, expanded);
  setTriggerState(targetId, expanded);

  if (controller.groupId) {
    setGroupCount(controller.groupId);

    if (controller.groupMode === 'accordion') {
      syncAccordionClasses(controller.groupId);
    }
  }
};

export const toggleExpandTarget = (targetId: string): boolean => {
  const controller = controllers.get(targetId);

  if (!controller) {
    return false;
  }

  const nextExpanded = !controller.rootElement.value?.classList.contains('expand-toggle--expanded');

  if (nextExpanded && controller.groupId && controller.groupMode === 'accordion') {
    getGroupTargetIds(controller.groupId)
      .filter((id) => id !== targetId)
      .forEach((id) => controllers.get(id)?.setExpandedState(false));
  }

  controller.setExpandedState(nextExpanded);
  return nextExpanded;
};

export const useExpandToggleGroupCount = (groupId: string) => computed(() => groupCounts.value[groupId] ?? 0);

export const useExpandToggle = (
  props: ExpandToggleProps,
  emit: (event: 'toggle', value: boolean) => void,
) => {
  const { t } = useI18n();
  const rootElement = ref<HTMLElement | null>(null);
  const expandedState = ref(props.expanded ?? props.initialExpanded ?? false);
  const setExpandedState = (expanded: boolean): void => {
    expandedState.value = expanded;
    applyExpandedState(props.targetId, expanded);
    emit('toggle', expanded);
  };
  const resolvedLabelKey = computed(() => (
    expandedState.value
      ? (props.expandedLabelKey ?? 'components.expandToggle.hideDetails')
      : (props.collapsedLabelKey ?? 'components.expandToggle.showDetails')
  ));
  const resolvedIcon = computed(() => (
    expandedState.value
      ? (props.expandedIcon ?? 'material/expand_less')
      : (props.collapsedIcon ?? 'material/expand_more')
  ));
  const resolvedLabel = computed(() => (
    props.labelMode === 'emoji' ? null : t(resolvedLabelKey.value)
  ));
  const resolvedAriaLabel = computed(() => (
    t(props.ariaLabelKey ?? resolvedLabelKey.value)
  ));
  const showsLabel = computed(() => props.labelMode !== 'emoji');
  const isPlain = computed(() => props.surfaceMode === 'plain');
  const rootClassNames = computed(() => [
    'expand-toggle',
    isPlain.value ? 'expand-toggle--plain' : 'expand-toggle--button',
    expandedState.value ? 'expand-toggle--expanded' : 'expand-toggle--collapsed',
    !showsLabel.value ? 'expand-toggle--emoji-only' : null,
    props.interactive === false ? 'expand-toggle--static' : null,
  ]);
  const toggleExpanded = (): void => {
    if (props.interactive === false) {
      return;
    }

    toggleExpandTarget(props.targetId);
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    if (!props.interactive || !isPlain.value || !isToggleKey(event.key)) {
      return;
    }

    event.preventDefault();
    toggleExpanded();
  };

  onMounted(() => {
    controllers.set(props.targetId, {
      groupId: props.groupId ?? null,
      groupMode: props.groupMode ?? 'independent',
      rootElement,
      setExpandedState,
      targetId: props.targetId,
    });
    applyExpandedState(props.targetId, expandedState.value);
  });

  onBeforeUnmount(() => {
    const groupId = controllers.get(props.targetId)?.groupId;
    controllers.delete(props.targetId);

    if (groupId) {
      setGroupCount(groupId);
      syncAccordionClasses(groupId);
    }
  });

  watch(() => props.expanded, (expanded) => {
    expandedState.value = expanded ?? props.initialExpanded ?? false;
    applyExpandedState(props.targetId, expandedState.value);
  });

  return {
    expandedState,
    handleKeydown,
    rootClassNames,
    rootElement,
    resolvedAriaLabel,
    resolvedIcon,
    resolvedLabel,
    showsLabel,
    toggleExpanded,
  };
};
