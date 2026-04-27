import { computed, defineComponent, ref, watch, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  buildBahnBookingUrl,
  canUseDeutschlandticket,
  formatConnectionDuration,
  formatProbability,
  getConnectionLeadLabel,
  requiresTrainTicketBooking,
} from '@/components/connection/connection-utils';
import type { ConnectionOption, ConnectionSummary } from '@/features/motis/routing-service.d';
import type { SharingSuggestion } from '@/features/sharing/sharing-service';
import type { ConnectionCardProps } from './ConnectionCard.d';

// 🧩 COMPONENTS
import ProductIcon from '@/components/ProductIcon/ProductIcon.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import ChipItem from '@/components/ChipItem/ChipItem.vue';
import Chip from '@/components/Chip/Chip.vue';
import Item from '@/components/Item/Item.vue';
import ExpandToggle from '@/components/ExpandToggle/ExpandToggle.vue';
import SharingOptionCard from '@/components/connection/SharingOptionCard.vue';
import ConnectionRouteDetails from '@/components/connection/ConnectionRouteDetails/ConnectionRouteDetails.vue';

const components = {
  ChipItem,
  Chip,
  ExpandToggle,
  Item,
  ConnectionRouteDetails,
  ProductIcon,
  SharingOptionCard,
  SvgIcon,
};

export default defineComponent({
  name: 'ConnectionCard',
  components,
  props: {
    connection: { type: Object as PropType<ConnectionSummary>, required: true },
    eventId: { type: String, default: undefined },
    eventStartIso: { type: String as PropType<string | null>, default: null },
    lastUpdatedIso: { type: String as PropType<string | null>, default: null },
    sharingSuggestion: { type: Object as PropType<SharingSuggestion | null>, default: null },
    deutschlandticketEnabled: { type: Boolean, default: undefined },
    bahnBookingClass: { type: String as PropType<'1' | '2' | undefined>, default: undefined },
    bahnTravelerProfileParam: { type: String, default: undefined },
    originAddress: { type: String as PropType<string | null>, default: null },
    destinationAddress: { type: String as PropType<string | null>, default: null },
  },
  emits: {
    toggle: (value: boolean): boolean => typeof value === 'boolean',
    'update-buffer': (value: number): boolean => Number.isFinite(value),
  },
  setup(props: ConnectionCardProps, { emit }) {
    const { t, locale } = useI18n();
    const selectedRoute = ref<'plan' | 'alternative'>('plan');
    const requestedBufferDraft = ref(props.connection.requestedBufferMinutes);
    const lastCommittedBuffer = ref(props.connection.requestedBufferMinutes);

    watch(
      () => props.connection.requestedBufferMinutes,
      (value) => {
        requestedBufferDraft.value = value;
        lastCommittedBuffer.value = value;
      },
      { immediate: true },
    );
    const primaryLeadLabel = computed(() =>
      getConnectionLeadLabel(props.eventStartIso ?? null, props.connection),
    );
    const formattedUpdatedAt = computed(() => {
      if (!props.lastUpdatedIso) {
        return null;
      }

      const date = new Date(props.lastUpdatedIso);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    });
    const hasSegments = computed(() => props.connection.segments.length > 0);
    const deutschlandticketActive = computed(() => props.deutschlandticketEnabled === true);
    const deutschlandticketAvailable = computed(() =>
      deutschlandticketActive.value && canUseDeutschlandticket(props.connection),
    );
    const bahnBookingUrl = computed(() => {
      if (!requiresTrainTicketBooking(props.connection, deutschlandticketActive.value)) {
        return null;
      }

      return buildBahnBookingUrl(props.connection, {
        deutschlandticketEnabled: deutschlandticketActive.value,
        bookingClass: props.bahnBookingClass,
        travelerProfileParam: props.bahnTravelerProfileParam,
      });
    });
    const bahnBookingLink = computed(() => {
      return {
        href: 'https://www.bahn.de/p/view/angebot/buchungsstrecke.shtml?lang=de&country=DEU&rt=1&start=Berlin%20Hbf&destination=Munchen%20Hbf&date=2024-12-31&time=12:00&trainCategory=ICE&trainNumber=123&bookingClass=2',
        text: 'foobar'
      };
    });
    const riskyTransfer = computed(
      () =>
        props.connection.delayPrediction?.transferAssessments
          .filter((assessment) => assessment.successProbability !== null)
          .sort((left, right) => (left.successProbability ?? 1) - (right.successProbability ?? 1))[0] ?? null,
    );
    const suggestedAlternative = computed(() => props.connection.alternatives[0] ?? null);
    const showRouteToggle = computed(() => Boolean(suggestedAlternative.value));
    const routeOption = computed(() =>
      showRouteToggle.value && selectedRoute.value === 'alternative'
        ? suggestedAlternative.value ?? props.connection
        : props.connection,
    );
    const routeDelayPrediction = computed(() =>
      showRouteToggle.value && selectedRoute.value === 'alternative'
        ? null
        : props.connection.delayPrediction ?? null,
    );
    const riskyTransferInfo = computed(() => {
      const exists = riskyTransfer.value;
      const num = riskyTransfer.value?.successProbability;
      const from: string | null = exists ? riskyTransfer.value.fromStopName : null;
      const to: string | null = exists ? riskyTransfer.value.toStopName : null;
      const value = num ? formatProbability(num) : null;
      return exists ? {
        from,
        to,
        value
      } : null;
    });

    const showRaisedBufferHint = computed(
      () => props.connection.effectiveBufferMinutes > props.connection.requestedBufferMinutes,
    );
    const bufferValueLabel = computed(() =>
      t('views.dashboard.events.connection.bufferValue', { count: requestedBufferDraft.value }),
    );
    const bufferInputId = computed(() => `connection-buffer-${props.eventId ?? 'default'}`);
    const detailsContentId = computed(() => `connection-details-${props.eventId ?? 'default'}`);
    const routeTitle = computed(() => {
      if (!showRouteToggle.value) {
        return t('views.dashboard.events.connection.route');
      }

      return selectedRoute.value === 'plan'
        ? t('views.dashboard.events.connection.delayRoutePlan')
        : t('views.dashboard.events.connection.delayRouteAlternative');
    });
    const alternativeEntries = computed(() => props.connection.alternatives.map((alternative: ConnectionOption) => {
      const key = [
        props.eventId ?? 'connection',
        alternative.departureIso ?? alternative.arrivalIso ?? alternative.departureTime,
        alternative.arrivalIso ?? alternative.arrivalTime,
      ].join('-');

      return {
        contentId: `connection-alternative-details-${key}`,
        key,
        leadLabel: getConnectionLeadLabel(props.eventStartIso ?? null, alternative),
        option: alternative,
      };
    }));

    const syncBufferDraft = (event: Event): void => {
      const nextValue = Number((event.target as HTMLInputElement).value);
      if (!Number.isFinite(nextValue)) {
        return;
      }

      requestedBufferDraft.value = nextValue;
    };

    const commitBufferChange = (): void => {
      const nextValue = requestedBufferDraft.value;
      if (!Number.isFinite(nextValue)) {
        requestedBufferDraft.value = props.connection.requestedBufferMinutes;
        return;
      }

      if (nextValue === lastCommittedBuffer.value) {
        return;
      }

      lastCommittedBuffer.value = nextValue;
      emit('update-buffer', nextValue);
    };

    const handleBufferKeyboardCommit = (event: KeyboardEvent): void => {
      if (
        event.key === 'ArrowLeft'
        || event.key === 'ArrowRight'
        || event.key === 'Home'
        || event.key === 'End'
      ) {
        commitBufferChange();
      }
    };

    return {
      bahnBookingLink,
      isDelayed: props.connection.status === 'delayed',
      alternativeEntries,
      bahnBookingUrl,
      bufferInputId,
      bufferValueLabel,
      commitBufferChange,
      deutschlandticketAvailable,
      detailsContentId,
      formatConnectionDuration,
      formattedUpdatedAt,
      handleBufferKeyboardCommit,
      hasSegments,
      primaryLeadLabel,
      requestedBufferDraft,
      riskyTransfer,
      riskyTransferInfo,
      routeDelayPrediction,
      routeOption,
      routeTitle,
      selectedRoute,
      showRaisedBufferHint,
      showRouteToggle,
      syncBufferDraft,
      t,
      emitToggle: (value: boolean): void => emit('toggle', value),
    };
  },
});
