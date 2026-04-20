import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatProbability } from '@/components/connection/connection-utils';
import type {
  ConnectionDelayCall,
  ConnectionSegment,
  ConnectionTransferAssessment,
} from '@/features/motis/routing-service';
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

  const toggleStop = (index: number): void => {
    selectedStopIndex.value = selectedStopIndex.value === index ? null : index;
  };

  const isPastStop = (index: number): boolean =>
    selectedStopIndex.value !== null && index < selectedStopIndex.value;

  const isSelectedStop = (index: number): boolean => selectedStopIndex.value === index;

  const getOffsetLabel = (stop: RouteStopEntry): string | null => {
    if (stop.minuteOffset === null || stop.minuteOffset <= 0) {
      return null;
    }

    return t('views.dashboard.events.connection.minutesFromStart', { count: stop.minuteOffset });
  };

  const getStopMeta = (stop: RouteStopEntry): string => {
    if (stop.kind === 'start') {
      return `${t('views.dashboard.events.connection.startLabel')} · ${t('views.dashboard.events.connection.departureLabel')} ${stop.departureTime ?? ''}`.trim();
    }

    if (stop.kind === 'end') {
      return `${t('views.dashboard.events.connection.endLabel')} · ${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime ?? ''}`.trim();
    }

    return [
      stop.arrivalTime ? `${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime}` : null,
      stop.departureTime ? `${t('views.dashboard.events.connection.continueLabel')} ${stop.departureTime}` : null,
    ].filter(Boolean).join(' · ');
  };

  const getTransitIncomingSegment = (index: number): ConnectionSegment | null => {
    const stop = routeStops.value[index];

    if (!stop) {
      return null;
    }

    if (stop.incomingSegment?.productType !== 'walk') {
      return stop.incomingSegment;
    }

    const previousStop = routeStops.value[index - 1] ?? null;
    return previousStop?.incomingSegment?.productType !== 'walk' ? previousStop?.incomingSegment ?? null : null;
  };

  const getTransitOutgoingSegment = (index: number): ConnectionSegment | null => {
    const stop = routeStops.value[index];

    if (!stop) {
      return null;
    }

    if (stop.outgoingSegment?.productType !== 'walk') {
      return stop.outgoingSegment;
    }

    const nextStop = routeStops.value[index + 1] ?? null;
    return nextStop?.outgoingSegment?.productType !== 'walk' ? nextStop?.outgoingSegment ?? null : null;
  };

  const getTransferAssessment = (index: number): ConnectionTransferAssessment | null => {
    if (!props.delayPrediction) {
      return null;
    }

    const incomingSegment = getTransitIncomingSegment(index);
    const outgoingSegment = getTransitOutgoingSegment(index);

    if (!incomingSegment || !outgoingSegment) {
      return null;
    }

    return props.delayPrediction.transferAssessments.find((assessment) => (
      assessment.incomingSegmentId === incomingSegment.id && assessment.outgoingSegmentId === outgoingSegment.id
    )) ?? null;
  };

  const getTransferTone = (successProbability: number | null): 'good' | 'warn' | 'bad' | 'neutral' => {
    if (successProbability === null) {
      return 'neutral';
    }

    if (successProbability >= 0.8) {
      return 'good';
    }

    if (successProbability >= 0.5) {
      return 'warn';
    }

    return 'bad';
  };

  const getPrimaryDelayCall = (index: number): ConnectionDelayCall | null => {
    if (!props.delayPrediction) {
      return null;
    }

    const stop = routeStops.value[index];

    if (!stop) {
      return null;
    }

    if (stop.kind === 'start') {
      const outgoingSegment = stop.outgoingSegment;

      if (outgoingSegment) {
        return props.delayPrediction.calls.find((call) => call.key === `${outgoingSegment.id}-departure`) ?? null;
      }
    }

    if (stop.kind === 'end') {
      const incomingSegment = stop.incomingSegment;

      if (incomingSegment) {
        return props.delayPrediction.calls.find((call) => call.key === `${incomingSegment.id}-arrival`) ?? null;
      }
    }

    return null;
  };

  const getPredictionProbability = (index: number): number | null => {
    const stop = routeStops.value[index];

    if (!stop) {
      return null;
    }

    if (stop.kind === 'stop') {
      return getTransferAssessment(index)?.successProbability ?? null;
    }

    return getPrimaryDelayCall(index)?.probabilityLate ?? null;
  };

  const getPredictionTone = (index: number): 'good' | 'warn' | 'bad' | 'neutral' => {
    const stop = routeStops.value[index];

    if (!stop) {
      return 'neutral';
    }

    if (stop.kind === 'stop') {
      return getTransferTone(getPredictionProbability(index));
    }

    const probability = getPredictionProbability(index);

    if (probability === null) {
      return 'neutral';
    }

    if (probability <= 0.2) {
      return 'good';
    }

    if (probability <= 0.5) {
      return 'warn';
    }

    return 'bad';
  };

  const getStopPredictionLabel = (index: number): string | null => {
    const stop = routeStops.value[index];
    const probability = formatProbability(getPredictionProbability(index));

    if (!stop || !probability) {
      return null;
    }

    if (stop.kind === 'start') {
      return t('views.dashboard.events.connection.departureProbabilityShort', { value: probability });
    }

    if (stop.kind === 'end') {
      return t('views.dashboard.events.connection.arrivalProbabilityShort', { value: probability });
    }

    return t('views.dashboard.events.connection.transferPossibleShort', { value: probability });
  };

  const getStopPredictionTitle = (index: number): string | null => {
    const stop = routeStops.value[index];

    if (!stop) {
      return null;
    }

    if (stop.kind === 'start') {
      return t('views.dashboard.events.connection.departureProbabilityLabel');
    }

    if (stop.kind === 'end') {
      return t('views.dashboard.events.connection.arrivalProbabilityLabel');
    }

    return t('views.dashboard.events.connection.transferPossibleLabel');
  };

  const getStopPredictionValue = (index: number): string | null => formatProbability(getPredictionProbability(index));

  const getRelatedDelayCalls = (index: number): ConnectionDelayCall[] => {
    if (!props.delayPrediction) {
      return [];
    }

    const related: ConnectionDelayCall[] = [];
    const incomingSegment = getTransitIncomingSegment(index);
    const outgoingSegment = getTransitOutgoingSegment(index);

    if (incomingSegment) {
      const incomingCall = props.delayPrediction.calls.find((call) => call.key === `${incomingSegment.id}-arrival`) ?? null;

      if (incomingCall) {
        related.push(incomingCall);
      }
    }

    if (outgoingSegment) {
      const outgoingCall = props.delayPrediction.calls.find((call) => call.key === `${outgoingSegment.id}-departure`) ?? null;

      if (outgoingCall) {
        related.push(outgoingCall);
      }
    }

    return related;
  };

  return {
    getOffsetLabel,
    getPredictionTone,
    getRelatedDelayCalls,
    getStopMeta,
    getStopPredictionLabel,
    getStopPredictionTitle,
    getStopPredictionValue,
    getTransferAssessment,
    isPastStop,
    isSelectedStop,
    routeStops,
    selectedStopIndex,
    t,
    toggleStop,
  };
};
