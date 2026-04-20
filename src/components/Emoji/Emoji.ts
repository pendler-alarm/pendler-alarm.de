const toCssDimension = (value: number | string | null | undefined): string | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : value;
};

export const getEmojiStyle = (options: {
  dimension?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  fontSize?: number | string | null;
}) => {
  const width = options.width ?? options.dimension;
  const height = options.height ?? options.dimension;

  return {
    width: toCssDimension(width),
    height: toCssDimension(height),
    fontSize: toCssDimension(options.fontSize),
  };
};
