<template>
  <span v-if="svgMarkup" class="svg-icon" aria-hidden="true" v-html="svgMarkup"></span>
</template>

<script lang="ts">
const SVG_PATH = '../assets/svg';
const svgFiles = import.meta.glob('../assets/svg/**/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const getSvgPath = (icon: string) => `${SVG_PATH}/${icon}.svg`;


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
  },
  computed: {
    resolvedWidth() {
      return this.width ?? this.dimension;
    },
    resolvedHeight() {
      return this.height ?? this.dimension;
    },
    svgMarkup() {
      const svg = svgFiles[getSvgPath(this.icon)];

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

.svg-icon :deep(svg) {
  display: block;
}
</style>
