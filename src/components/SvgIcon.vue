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

<script lang="ts">
const SVG_PATH = '../assets/svg';
const svgFiles = import.meta.glob('../assets/svg/**/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const normalizeIconName = (icon: string) =>
  icon
    .replace(/^\/+/ , '')
    .replace(/^\.\//, '')
    .replace(/\.svg$/i, '');

const resolveSvg = (icon: string): string => {
  const normalizedIcon = normalizeIconName(icon);
  const directPath = `${SVG_PATH}/${normalizedIcon}.svg`;

  if (svgFiles[directPath]) {
    return svgFiles[directPath];
  }

  const match = Object.entries(svgFiles).find(([path]) => path.endsWith(`/${normalizedIcon}.svg`));
  return match?.[1] ?? '';
};

const toCssDimension = (value: number | string) =>
  typeof value === 'number' ? `${value}px` : value;


export default {
  name: 'SvgIcon',
  props: {
    icon: {
      type: String,
      required: true,
    },
    dimension: {
      type: [Number, String],
      default: 20,
    },
    width: {
      type: [Number, String],
      default: null,
    },
    height: {
      type: [Number, String],
      default: null,
    },
    fallbackText: {
      type: String,
      default: '',
    },
  },
  computed: {
    resolvedWidth() {
      return this.width ?? this.dimension;
    },
    resolvedHeight() {
      return this.height ?? this.dimension;
    },
    fallbackStyle() {
      return {
        width: toCssDimension(this.resolvedWidth),
        height: toCssDimension(this.resolvedHeight),
      };
    },
    svgMarkup() {
      const svg = resolveSvg(this.icon);

      if (!svg) {
        return '';
      }

      const sanitizedSvg = svg
        .replace(/\swidth="[^"]*"/i, '')
        .replace(/\sheight="[^"]*"/i, '');

      return sanitizedSvg.replace(
        /<svg\b([^>]*)>/i,
        `<svg$1 width="${this.resolvedWidth}" height="${this.resolvedHeight}">`,
      );
    },
  },
};
</script>

<style scoped>
.svg-icon {
  display: inline-flex;
  line-height: 0;
}

.svg-icon--fallback {
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  padding: 0 8px;
  background: rgba(15, 23, 42, 0.12);
  color: currentColor;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.svg-icon :deep(svg) {
  display: block;
}
</style>
