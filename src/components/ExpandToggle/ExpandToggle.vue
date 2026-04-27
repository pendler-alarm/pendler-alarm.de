<template>
  <button
    v-if="surfaceMode !== 'plain'"
    ref="rootElement"
    type="button"
    :class="rootClassNames"
    :aria-expanded="expandedState"
    :aria-controls="targetId"
    :aria-label="resolvedAriaLabel"
    :disabled="interactive === false"
    @click="toggleExpanded"
  >
    <SvgIcon :icon="resolvedIcon" :dimension="dimension" aria-hidden="true" />
    <span v-if="showsLabel" class="expand-toggle__label">{{ resolvedLabel }}</span>
  </button>
  <span
    v-else
    ref="rootElement"
    :class="rootClassNames"
    :aria-controls="interactive === false ? undefined : targetId"
    :aria-expanded="interactive === false ? undefined : expandedState"
    :aria-hidden="interactive === false ? 'true' : undefined"
    :aria-label="interactive === false ? undefined : resolvedAriaLabel"
    :role="interactive === false ? undefined : 'button'"
    :tabindex="interactive === false ? undefined : 0"
    @click="interactive === false ? undefined : toggleExpanded()"
    @keydown="handleKeydown"
  >
    <SvgIcon :icon="resolvedIcon" :dimension="dimension" aria-hidden="true" />
    <span v-if="showsLabel" class="expand-toggle__label">{{ resolvedLabel }}</span>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import './ExpandToggle.css';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import { useExpandToggle } from './ExpandToggle.ts';
import type { ExpandToggleProps } from './ExpandToggle.d';

export default defineComponent({
  name: 'ExpandToggle',
  components: {
    SvgIcon,
  },
  props: {
    expanded: { type: Boolean, default: undefined },
    initialExpanded: { type: Boolean, default: false },
    targetId: { type: String, required: true },
    groupId: { type: String, default: null },
    groupMode: { type: String, default: 'independent' },
    collapsedLabelKey: { type: String, default: null },
    expandedLabelKey: { type: String, default: null },
    collapsedIcon: { type: String, default: 'material/expand_more' },
    expandedIcon: { type: String, default: 'material/expand_less' },
    ariaLabelKey: { type: String, default: null },
    interactive: { type: Boolean, default: true },
    labelMode: { type: String, default: 'text+emoji' },
    surfaceMode: { type: String, default: 'button' },
    dimension: { type: [Number, String], default: 18 },
  },
  emits: {
    toggle: (value: boolean): boolean => typeof value === 'boolean',
  },
  setup(props: ExpandToggleProps, { emit }) {
    return useExpandToggle(props, emit);
  },
});
</script>
