<template>

  <component :is="tagName" v-if="shouldRender" :class="rootClassName" v-bind="rootAttributes">
    <span v-if="props.emoji" class="chip__emoji" aria-hidden="true">{{ props.emoji }}</span>
    <slot v-if="hasCustomSlot" name="custom" />
    <span v-else>{{ label }}</span>
  </component>
</template>

<script lang="ts">
import { Comment, Fragment, Text, computed, defineComponent, type PropType, type VNode } from 'vue';
// import { useI18n } from 'vue-i18n';
import './Chip.css';
import {
  getLabel,
  getType,
  getClassNames,
  getLinkAttributes,
} from './Chip.ts';
import type { ChipProps, ChipType } from './Chip.d';
import { checkVisibility } from '../_shared/utils/utils.ts';

const hasRenderableSlotContent = (nodes: VNode[] = []): boolean => nodes.some((node) => {
  if (node.type === Comment) {
    return false;
  }

  if (node.type === Text) {
    return String(node.children ?? '').trim().length > 0;
  }

  if (node.type === Fragment) {
    return hasRenderableSlotContent(Array.isArray(node.children) ? node.children as VNode[] : []);
  }

  return true;
});

export default defineComponent({
  name: 'Chip',
  props: {
    tagName: { type: String, default: 'span', },
    rootAttributes: { type: Object, default: null, },
    rootClassName: { type: [String, Array, Object], default: null, },
    text: { type: String as PropType<string | null>, default: null },
    emoji: { type: String, default: null },
    labelKey: { type: String, default: null },
    labelParams: { type: Object, default: null },
    link: { type: Object, default: null },
    type: { type: String, default: 'default' },
  },
  setup(props: ChipProps, { slots }) {
    // const { t } = useI18n();

    const resolvedType = computed<ChipType>(() => getType(props.type));
    const isLink = computed(() => Boolean(props.link?.href));
    const hasCustomSlot = computed(() => hasRenderableSlotContent(slots.custom?.()));
    const tagName = computed(() => {
      if (isLink.value) {
        return 'a';
      }
      if (hasCustomSlot.value) {
        return 'div';
      }
      return props.tagName || 'span';
    });
    const type: ChipType = (resolvedType.value || 'default') as ChipType;
    const shouldRender = computed(() => hasCustomSlot.value || checkVisibility(props, ['text', 'link']));
    const label = computed(() => { return getLabel(type, props); }); // TODO: getLabel from utils
    const rootClassName = computed(() => getClassNames(type, isLink.value, props.className));
    const rootAttributes = computed(() => getLinkAttributes(props.link));

    return {
      tagName,
      hasCustomSlot,
      rootAttributes,
      rootClassName,
      label,
      props,
      shouldRender,
    };
  },
});
</script>
