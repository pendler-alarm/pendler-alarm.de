import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnectionPrediction } from '@/components/connection/prediction/prediction';
import type { ConnectionRouteDetailsProps } from './ConnectionRouteDetails.d';
import type { RouteStopEntry } from '../ConnectionRouteDetail/ConnectionRouteDetail.d';

const getMinuteOffset = (value: string | null, reference: string | null): number | null => {
  if (!value || !reference) {
    return null;
  }

  const diffMs = new Date(value).getTime() - new Date(reference).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

export const useConnectionRouteDetails = (props: ConnectionRouteDetailsProps) => {
  const { t } = useI18n();
  const selectedStopIndex = ref<number | null>(null);

  const routeStops = computed<RouteStopEntry[]>(() => {
    if (props.option.segments.length === 0) {
      return [];
    }

    const entries: RouteStopEntry[] = [];
    const [firstSegment] = props.option.segments;

    if (firstSegment) {
      entries.push({
        key: `${firstSegment.id}-start`,
        kind: 'start',
        name: firstSegment.fromStop,
        minuteOffset: 0,
        arrivalTime: null,
        departureTime: firstSegment.departureTime,
        incomingSegment: null,
        outgoingSegment: firstSegment,
      });
    }

    props.option.segments.forEach((segment, index) => {
      const nextSegment = props.option.segments[index + 1] ?? null;
      const isLast = index === props.option.segments.length - 1;

      entries.push({
        key: `${segment.id}-end`,
        kind: isLast ? 'end' : 'stop',
        name: segment.toStop,
        minuteOffset: getMinuteOffset(segment.arrivalIso, props.option.departureIso),
        arrivalTime: segment.arrivalTime,
        departureTime: nextSegment?.departureTime ?? null,
        incomingSegment: segment,
        outgoingSegment: nextSegment,
      });
    });

    return entries;
  });

  const delayPrediction = computed(() => props.delayPrediction ?? null);
  const prediction = useConnectionPrediction(delayPrediction, routeStops);

  const toggleStop = (index: number): void => {
    selectedStopIndex.value = selectedStopIndex.value === index ? null : index;
  };

  const isPastStop = (index: number): boolean => (
    selectedStopIndex.value !== null && index < selectedStopIndex.value
  );

  const isSelectedStop = (index: number): boolean => selectedStopIndex.value === index;

  const getOffsetLabel = (stop: RouteStopEntry): string | null => {
    if (stop.minuteOffset === null || stop.minuteOffset <= 0) {
      return null;
    }

    return t('views.dashboard.events.connection.minutesFromStart', { count: stop.minuteOffset });
  };

  const getStopMeta = (stop: RouteStopEntry): string => {
    if (stop.kind === 'start') {
      return `${t('views.dashboard.events.connection.startLabel')} \u00b7 ${t('views.dashboard.events.connection.departureLabel')} ${stop.departureTime ?? ''}`.trim();
    }

    if (stop.kind === 'end') {
      return `${t('views.dashboard.events.connection.endLabel')} \u00b7 ${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime ?? ''}`.trim();
    }

    return [
      stop.arrivalTime ? `${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime}` : null,
      stop.departureTime ? `${t('views.dashboard.events.connection.continueLabel')} ${stop.departureTime}` : null,
    ].filter(Boolean).join(' \u00b7 ');
  };

  return {
    getOffsetLabel,
    getStopMeta,
    isPastStop,
    isSelectedStop,
    routeStops,
    selectedStopIndex,
    t,
    toggleStop,
    ...prediction,
  };
};
