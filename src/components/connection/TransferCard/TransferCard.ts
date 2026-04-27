import { defineComponent, type PropType } from 'vue';
import Chip from '@/components/Chip/Chip.vue';
import ChipItem from '@/components/ChipItem/ChipItem.vue';
import type { ChipLink } from '@/components/Chip/Chip.d';
import type { TransferCardProps, TransferCardTone } from './TransferCard.d';

export default defineComponent({
  name: 'TransferCard',
  components: {
    Chip,
    ChipItem,
  },
  props: {
    hasStationChange: { type: Boolean, default: false },
    incomingStationLink: { type: Object as PropType<ChipLink | null>, default: null },
    missedProbabilityLabel: { type: String as PropType<string | null>, default: null },
    outgoingWalkStationLink: { type: Object as PropType<ChipLink | null>, default: null },
    transferDistanceLabel: { type: String as PropType<string | null>, default: null },
    transferFeasibilityLabel: { type: String as PropType<string | null>, default: null },
    transferLabel: { type: String as PropType<string | null>, default: null },
    transferRouteLink: { type: Object as PropType<ChipLink | null>, default: null },
    transferStationChangeLabel: { type: String as PropType<string | null>, default: null },
    transferTone: { type: String as PropType<TransferCardTone>, required: true },
    transferWalkSummary: { type: String as PropType<string | null>, default: null },
  },
  setup(props: TransferCardProps) {
    return {
      props,
    };
  },
});
