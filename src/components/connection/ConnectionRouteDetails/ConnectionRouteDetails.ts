import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnectionPrediction } from '@/components/connection/prediction/prediction';
import type { ConnectionRouteDetailsProps } from './ConnectionRouteDetails.d';
import type { RouteStopEntry } from '../ConnectionRouteDetail/ConnectionRouteDetail.d';

type RouteSegment = ConnectionRouteDetailsProps['option']['segments'][number];
type RouteStopViewModel = RouteStopEntry & { contentId: string };

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
  const routeStopGroupId = computed(() => [
    'connection-route',
    props.option.departureIso ?? props.option.departureTime,
    props.option.arrivalIso ?? props.option.arrivalTime,
  ].join('-'));

  const routeStops = computed<RouteStopViewModel[]>(() => {
    if (props.option.segments.length === 0) {
      return [];
    }

    const entries: RouteStopViewModel[] = [];
    const [firstSegment] = props.option.segments;

    if (firstSegment) {
      entries.push({
        contentId: `connection-route-stop-${firstSegment.id}-start`,
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

    props.option.segments.forEach((segment: RouteSegment, index: number) => {
      const nextSegment = props.option.segments[index + 1] ?? null;
      const isLast = index === props.option.segments.length - 1;

      entries.push({
        contentId: `connection-route-stop-${segment.id}-end`,
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
    routeStops,
    routeStopGroupId,
    t,
    ...prediction,
  };
};
