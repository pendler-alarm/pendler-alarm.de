<template>
  <span v-if="svgMarkup" class="svg-icon" aria-hidden="true" v-html="svgMarkup"></span>
  <span
    v-else-if="fallbackText"
    class="svg-icon svg-icon--fallback"
    :style="fallbackStyle"
    aria-hidden="true"
  >
    {{ fallbackText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import './SvgIcon.css';
import { resolveSvgMarkup, toCssDimension } from './SvgIcon.ts';

const props = withDefaults(defineProps<{
  icon: string;
  dimension?: number | string;
  width?: number | string | null;
  height?: number | string | null;
  fallbackText?: string;
}>(), {
  dimension: 20,
  width: null,
  height: null,
  fallbackText: '',
});

const resolvedWidth = computed(() => props.width ?? props.dimension);
const resolvedHeight = computed(() => props.height ?? props.dimension);

const fallbackStyle = computed(() => ({
  width: toCssDimension(resolvedWidth.value),
  height: toCssDimension(resolvedHeight.value),
}));

const svgMarkup = computed(() => resolveSvgMarkup(
  props.icon,
  resolvedWidth.value,
  resolvedHeight.value,
));
</script>
