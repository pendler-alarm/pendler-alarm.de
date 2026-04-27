import { normalizeFilePath } from '@/lib/utils/normalize/normalize';

const SVG_PATH = '../../assets/svg';
const svgFiles = import.meta.glob('../../assets/svg/**/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const resolveSvg = (icon: string): string => {
  const normalizedIcon = normalizeFilePath(icon);
  const directPath = `${SVG_PATH}/${normalizedIcon}.svg`;

  if (svgFiles[directPath]) {
    return svgFiles[directPath];
  }

  const match = Object.entries(svgFiles).find(([path]) => path.endsWith(`/${normalizedIcon}.svg`));
  return match?.[1] ?? '';
};

export const toCssDimension = (value: number | string): string => (
  typeof value === 'number' ? `${value}px` : value
);

export const addDimension = (svg: string, width: number, height: number) => {
  const result: string = svg
    .replace(/\swidth="[^"]*"/iu, '')
    .replace(/\sheight="[^"]*"/iu, '');

  return result.replace(
    /<svg\b([^>]*)>/iu,
    `<svg$1 width="${width}" height="${height}">`,
  );
};

/**
 * resolve the svg markup for a given icon name and add width and height attributes
 * @param {string} icon the name of the icon, e.g. 'material/event'
 * @param {number|string} width the width of the icon
 * @param {number|string} height the height of the icon
 * @returns {string} the svg markup with the specified width and height
 */
export const resolveSvgMarkup = (
  icon: string,
  width: number | string,
  height: number | string,
): string => {
  const svg = resolveSvg(icon);

  if (!svg) {
    return '';
  }

  return addDimension(svg, Number(width), Number(height));
};
