import type { CHIP_TYPE_CONFIG } from './Chip.ts';

export type ChipType = keyof typeof CHIP_TYPE_CONFIG;
export type ChipLink = {
  href: string;
  text?: string;
  target?: string;
  rel?: string;
};

export type ChipProps = {
  text?: string | null;
  emoji?: string | null;
  labelKey?: string | null;
  className?: string | null;
  tagName?: string | null;
  labelParams?: Record<string, unknown> | null;
  link?: ChipLink | null;
  type?: ChipType;
};
export type ChipTypeConfig = {
  className: string;
  i18nPrefix?: string;
  labels?: Record<string, string>;
};
export type CHIP_CONFIG = Record<ChipType, ChipTypeConfig>;