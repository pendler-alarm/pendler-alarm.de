<template>
  <Emoji v-if="emoji" class="product-icon" :emoji="emoji" :decorative="props.decorative" :label="props.label"
    :dimension="resolvedEmojiDimension ?? undefined" :width="resolvedEmojiWidth ?? undefined"
    :height="resolvedEmojiHeight ?? undefined" :font-size="resolvedEmojiFontSize ?? undefined" />
  <SvgIcon v-else class="product-icon" :icon="icon" :fallback-text="fallbackText"
    :dimension="resolvedDimension ?? undefined" :width="resolvedWidth ?? undefined"
    :height="resolvedHeight ?? undefined" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import Emoji from '@/components/Emoji/Emoji.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import {
  getConnectionProductEmoji,
  getConnectionProductFallbackLabel,
  getConnectionProductIcon,
} from '@/components/connection/connection-utils';
import type { ConnectionProductType } from '@/features/motis/routing-service.d';
import type { RouteStopEntry } from '@/components/connection/ConnectionRouteDetail/ConnectionRouteDetail.d';
import './ProductIcon.css';
import type { ProductIconProps } from './ProductIcon.d';

export default defineComponent({
  name: 'ProductIcon',
  components: {
    Emoji,
    SvgIcon,
  },
  props: {
    productType: { type: String, default: null },
    segment: { type: Object, default: null },
    stop: { type: Object, default: null },
    isDestination: { type: Boolean, default: false },
    defaultIcon: { type: String, default: 'products/BAHN' },
    decorative: { type: Boolean, default: true },
    label: { type: String, default: '' },
    dimension: { type: [Number, String], default: null },
    width: { type: [Number, String], default: null },
    height: { type: [Number, String], default: null },
    emojiDimension: { type: [Number, String], default: null },
    emojiWidth: { type: [Number, String], default: null },
    emojiHeight: { type: [Number, String], default: null },
    emojiFontSize: { type: [Number, String], default: null },
  },
  setup(props: ProductIconProps) {
    const getStopMarkerProductType = (stop: RouteStopEntry | null | undefined): ConnectionProductType | null => {
      if (!stop) {
        return null;
      }

      return stop.outgoingSegment?.productType ?? stop.incomingSegment?.productType ?? null;
    };

    const productType = computed(() => (
      props.productType ?? props.segment?.productType ?? getStopMarkerProductType(props.stop)
    ));

    const isDestination = computed(() => props.isDestination || props.stop?.kind === 'end');
    const isRouteStop = computed(() => props.stop !== null && props.stop !== undefined);
    const isRouteSegment = computed(() => props.segment !== null && props.segment !== undefined);
    const resolvedWidth = computed(() => props.width ?? (isRouteStop.value ? 18 : isRouteSegment.value ? 48 : null));
    const resolvedHeight = computed(() => props.height ?? (isRouteStop.value ? 18 : isRouteSegment.value ? 22 : null));
    const resolvedDimension = computed(() => props.dimension ?? null);
    const resolvedEmojiDimension = computed(() => props.emojiDimension ?? null);
    const resolvedEmojiWidth = computed(() => props.emojiWidth ?? (isRouteSegment.value ? 24 : null));
    const resolvedEmojiHeight = computed(() => props.emojiHeight ?? null);
    const resolvedEmojiFontSize = computed(() => (
      props.emojiFontSize ?? (isRouteStop.value ? '0.82rem' : isRouteSegment.value ? '1rem' : null)
    ));

    const emoji = computed(() => {
      if (productType.value) {
        return getConnectionProductEmoji(productType.value, { isDestination: isDestination.value });
      }

      return isDestination.value ? '🎯' : null;
    });

    const icon = computed(() => (
      productType.value
        ? (getConnectionProductIcon(productType.value) ?? props.defaultIcon ?? 'products/BAHN')
        : (props.defaultIcon ?? 'products/BAHN')
    ));

    const fallbackText = computed(() => (
      productType.value ? getConnectionProductFallbackLabel(productType.value) : ''
    ));

    return {
      emoji,
      fallbackText,
      icon,
      props,
      resolvedDimension,
      resolvedEmojiDimension,
      resolvedEmojiFontSize,
      resolvedEmojiHeight,
      resolvedEmojiWidth,
      resolvedHeight,
      resolvedWidth,
    };
  },
});
</script>
