<template>
  <span v-if="svgMarkup" class="svg-icon" aria-hidden="true" v-html="svgMarkup"></span>
  <span v-else-if="fallbackText" class="svg-icon svg-icon--fallback" :style="fallbackStyle" aria-hidden="true">
    {{ fallbackText }}
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import './SvgIcon.css';
import { resolveSvgMarkup, toCssDimension } from './SvgIcon.ts';
import type { SvgIconProps } from './SvgIcon.d';

export default defineComponent({
  name: 'SvgIcon',
  props: {
    icon: { type: String, required: true },
    dimension: { type: [Number, String], default: 20, },
    width: { type: [Number, String], default: null, },
    height: { type: [Number, String], default: null, },
    fallbackText: { type: String, default: '', },
  },
  setup(props: SvgIconProps) {
    const resolvedWidth = computed(() => props.width ?? props.dimension ?? 20);
    const resolvedHeight = computed(() => props.height ?? props.dimension ?? 20);

    const fallbackStyle = computed(() => ({
      width: toCssDimension(resolvedWidth.value),
      height: toCssDimension(resolvedHeight.value),
    }));

    const svgMarkup = computed(() => resolveSvgMarkup(
      props.icon,
      resolvedWidth.value,
      resolvedHeight.value,
    ));

    return {
      fallbackStyle,
      svgMarkup,
    };
  },
});
</script>
