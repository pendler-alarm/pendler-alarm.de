import type { ChipType } from '@/components/Chip/Chip.d';
import type { LINK, StyledItemProps } from '@/components/Item/Item.d';

export type ChipItemProps = {
  chipType?: ChipType;
  emoji?: string | null;
  label?: string | null;
  labelStyle?: StyledItemProps | null;
  bold?: boolean;
  labelProps?: Record<string, unknown> | null;
  rootAttributes?: Record<string, unknown> | null;
  rootClassName?: string | string[] | Record<string, boolean> | null;
  itemClassName?: string | string[] | Record<string, boolean> | null;
  separator?: string;
  show?: boolean;
  text?: string | null;
  link?: LINK | null;
  type?: string;
  value?: string | null;
};
