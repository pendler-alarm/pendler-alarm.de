import { defineComponent } from 'vue';

const SVG_PATH = '../../assets/svg';
const svgFiles = import.meta.glob('../../assets/svg/**/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const normalizeIconName = (icon: string) =>
  icon
    .replace(/^\/+/, '')
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

const toCssDimension = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

export default defineComponent({
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
    resolvedWidth(): number | string {
      return this.width ?? this.dimension;
    },
    resolvedHeight(): number | string {
      return this.height ?? this.dimension;
    },
    fallbackStyle(): { width: string; height: string } {
      return {
        width: toCssDimension(this.resolvedWidth),
        height: toCssDimension(this.resolvedHeight),
      };
    },
    svgMarkup(): string {
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
});
