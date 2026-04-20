import type {
  ConnectionProductType,
  ConnectionSegment,
} from '@/features/motis/routing-service';
import type { RouteStopEntry } from '@/components/connection/ConnectionRouteDetail/ConnectionRouteDetail.d';

export type ProductIconProps = {
  productType?: ConnectionProductType | null;
  segment?: ConnectionSegment | null;
  stop?: RouteStopEntry | null;
  isDestination?: boolean;
  defaultIcon?: string;
  decorative?: boolean;
  label?: string;
  dimension?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  emojiDimension?: number | string | null;
  emojiWidth?: number | string | null;
  emojiHeight?: number | string | null;
  emojiFontSize?: number | string | null;
};
