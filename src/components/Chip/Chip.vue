<template>

  <component :is="tagName" v-if="shouldRender" :class="rootClassName" v-bind="rootAttributes">
    <span v-if="props.emoji" class="chip__emoji" aria-hidden="true">{{ props.emoji }}</span>
    <span>{{ label }}</span>
  </component>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
// import { useI18n } from 'vue-i18n';
import './Chip.css';
import {
  getLabel,
  getType,
  getClassNames,
  getLinkAttributes,
} from './Chip.ts';
import type { ChipProps, ChipType } from './Chip.d';


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
  setup(props: ChipProps) {
    // const { t } = useI18n();

    const resolvedType = computed<ChipType>(() => getType(props.type));
    const isLink = computed(() => Boolean(props.link?.href));
    const tagName = computed(() => isLink.value ? 'a' : 'span');
    const type: ChipType = (resolvedType.value || 'default') as ChipType;
    const shouldRender = computed(() => Boolean(props.text || props.link));
    const label = computed(() => { return getLabel(type, props); });
    const rootClassName = computed(() => getClassNames(type, isLink.value, props.className));
    const rootAttributes = computed(() => getLinkAttributes(props.link));

    return {
      tagName,
      rootAttributes,
      rootClassName,
      label,
      props,
      shouldRender,
    };
  },
});
</script>
