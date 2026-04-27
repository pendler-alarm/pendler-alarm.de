<template>

  <component :is="tagName" v-if="shouldRender" :class="rootClassName" v-bind="rootAttributes" :data-type="resolvedType">
    <span v-if="props.emoji" class="chip__emoji" aria-hidden="true">{{ props.emoji }}</span>
    <slot v-if="hasCustomSlot" name="custom" />
    <span v-else>{{ label }}</span>
  </component>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
// import { useI18n } from 'vue-i18n';
import './Chip.css';
import type { LINK } from '@/components/Item/Item.d';
import {
  getLabel,
  getClassNames,
  getLinkAttributes,
} from './Chip.ts';
import type { ChipProps, ChipType } from './Chip.d';
import { checkVisibility, getTypeByConfig, hasRenderableSlotContent } from '../_shared/utils/utils.ts';
import { CHIP_TYPE_CONFIG } from './Chip.config.ts';

export default defineComponent({
  name: 'Chip',
  props: {
    tagName: { type: String, default: 'span', },
    rootAttributes: { type: Object, default: null, },
    rootClassName: { type: [String, Array, Object], default: null, },
    text: { type: String as PropType<string | null>, default: null },
    emoji: { type: String, default: null },
    labelKey: { type: String, default: null },
    labelParams: { type: Object, default: null }, // TODO: labelProps?
    link: { type: Object as PropType<LINK | null>, default: null },
    type: { type: String, default: 'default' },
  },
  setup(props: ChipProps, { slots }) {
    // const { t } = useI18n();

    const isLink = computed(() => Boolean(props.link?.href));
    const hasCustomSlot = hasRenderableSlotContent(slots.custom?.());
    const tagName = computed(() => {
      if (isLink.value) {
        return 'a';
      }
      if (hasCustomSlot) {
        return 'div';
      }
      return props.tagName || 'span';
    });
    const resolvedType: ChipType = getTypeByConfig(props, CHIP_TYPE_CONFIG);
    const shouldRender = computed(() => hasCustomSlot || checkVisibility(props, ['text', 'link']));
    const label = computed(() => { return getLabel(resolvedType, props); }); // TODO: getLabel from utils
    const rootClassName = computed(() => getClassNames(resolvedType, isLink.value, props.className));
    const rootAttributes = computed(() => getLinkAttributes(props.link));

    return {
      tagName,
      hasCustomSlot,
      rootAttributes,
      rootClassName,
      resolvedType,
      label,
      props,
      shouldRender,
    };
  },
});
</script>
