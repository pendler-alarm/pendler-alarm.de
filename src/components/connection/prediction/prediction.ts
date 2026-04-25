import { type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatProbability } from '@/components/connection/connection-utils';
import type {
  $ConnectionSegment,
  $ConnectionTransferAssessment,
  ConnectionDelayCall,
  ConnectionDelayPrediction,
  ConnectionTransferAssessment,
} from '@/features/motis/routing-service.d';
import type { $RouteStopEntry, RouteStopEntry } from '../ConnectionRouteDetail/ConnectionRouteDetail.d';
import type { $PROBABILITY, ConnectionPrediction, PredictionContext, PredictionTone, PROBABILITY } from './prediction.d';
import type { IN_OUT } from './segment/segment.d';
import { getTransitIncomingSegment, getTransitOutgoingSegment } from './segment/segment';


/**
 * 🎯 Get the tone for a transfer prediction based on the success probability (0 = bad, 1 = good).
 */
export const getTransferTone = (probability: $PROBABILITY): PredictionTone => {
  if (probability === null) return 'neutral';
  return getPredictionType(1 - probability); //inverse of probability of missed connection
};

const getPrimaryDelayCall = (
  delayPrediction: ConnectionDelayPrediction | null | undefined,
  stop: RouteStopEntry,
): ConnectionDelayCall | null => {
  if (!delayPrediction) {
    return null;
  }

  if (stop.kind === 'start' && stop.outgoingSegment) {
    return delayPrediction.calls.find((call) => call.key === `${stop.outgoingSegment?.id}-departure`) ?? null;
  }

  if (stop.kind === 'end' && stop.incomingSegment) {
    return delayPrediction.calls.find((call) => call.key === `${stop.incomingSegment?.id}-arrival`) ?? null;
  }

  return null;
};
/**
 * 🎯 Get the transfer assessment for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the transfer assessment.
 * @returns {$ConnectionTransferAssessment} 📤 The transfer assessment for the stop, or null if not available.
 */
export const getTransferAssessment = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): $ConnectionTransferAssessment => {
  if (!stop) return null;
  const { delayPrediction, routeStops } = context;

  if (!delayPrediction) {
    return null;
  }

  const incomingSegment = getTransitIncomingSegment(routeStops, stop);
  const outgoingSegment = getTransitOutgoingSegment(routeStops, stop);

  if (!incomingSegment || !outgoingSegment) {
    return null;
  }

  return delayPrediction.transferAssessments.find((assessment: ConnectionTransferAssessment) => (
    assessment.incomingSegmentId === incomingSegment.id && assessment.outgoingSegmentId === outgoingSegment.id
  )) ?? null;
};
/**
 * 🎯 Get the prediction probability for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the prediction probability.
 * @returns {$PROBABILITY} 📤 The prediction probability for the stop, or null if not available.
 */
export const getPredictionProbability = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): $PROBABILITY => {
  if (!stop) return null;

  if (stop.kind === 'stop') {
    return getTransferAssessment(context, stop)?.successProbability ?? null;
  }

  return getPrimaryDelayCall(context.delayPrediction, stop)?.probabilityLate ?? null;
};
/**
 * 🎯 Get the prediction type based on the probability.
 * @param { $PROBABILITY } probability ➡️ The probability value (0 = good, 1 = bad).
 * @returns {PredictionTone} 📤 The prediction type ('good', 'warn', 'bad', 'neutral').
 */
export const getPredictionType = (probability: $PROBABILITY): PredictionTone => {
  if (probability === null) {
    return 'neutral';
  }

  return probability <= 0.2 ? 'good' : probability <= 0.5 ? 'warn' : 'bad';
};
/**
 * 🎯 Get the prediction tone for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the prediction tone.
 * @returns {PredictionTone} 📤 The prediction tone for the stop ('good', 'warn', 'bad', 'neutral').
 */
export const getPredictionTone = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): PredictionTone => {
  if (!stop) {
    return 'neutral';
  }

  const probability: $PROBABILITY = getPredictionProbability(context, stop);
  if (stop.kind === 'stop') { // TODO: maybe dissolve
    return getTransferTone(getPredictionProbability(context, stop));
  }

  return getPredictionType(probability);
};
/**
 * 🎯 Get the prediction label for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the prediction label.
 * @returns {string | null} 📤 The prediction label for the stop, or null if not available.
 */
export const getStopPredictionLabel = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): string | null => {
  if (!stop) return null;
  const probability = formatProbability(getPredictionProbability(context, stop));

  if (!probability) { // TODO: auflösen
    return null;
  }
  let key = 'transferPossibleShort'; // default
  switch (stop.kind) {
    case 'start': key = 'departureProbabilityShort'; break;
    case 'end': key = 'arrivalProbabilityShort'; break;
    default: key = 'transferPossibleShort';
  }

  return context.t(`views.dashboard.events.connection.${key}`, { value: probability });
};
/**
 * 🎯 Get the prediction title for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the prediction title.
 * @returns {string | null} 📤 The prediction title for the stop, or null if not available.
 */
export const getStopPredictionTitle = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): string | null => {
  if (!stop) return null;
  let key = 'transferPossibleLabel'; // default
  switch (stop.kind) {
    case 'start': key = 'departureProbabilityLabel'; break;
    case 'end': key = 'arrivalProbabilityLabel'; break;
    default: key = 'transferPossibleLabel';
  }

  return context.t(`views.dashboard.events.connection.${key}`);
};
/**
 * 🎯 Get the prediction value for a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the prediction value.
 * @returns {string | null} 📤 The prediction value for the stop, or null if not available.
 */
export const getStopPredictionValue = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): string | null => formatProbability(getPredictionProbability(context, stop));
/**
 * 🎯 Get the delay calls related to a given stop and segment, and add them to the related calls array.
 * @param {IN_OUT} direction ➡️ The direction of the segment ('incoming' or 'outgoing').
 * @param {ConnectionDelayCall[]} related ➡️ The array to which related calls will be added.
 * @param {$ConnectionSegment} segment ➡️ The connection segment for which to find related delay calls.
 * @param {ConnectionDelayCall[]} calls ➡️ The list of all delay calls to search within.
 * @returns {void}
 */
export const getRelated = (direction: IN_OUT, related: ConnectionDelayCall[], segment: $ConnectionSegment, calls: ConnectionDelayCall[]) => {
  const suffix = direction === 'incoming' ? 'arrival' : 'departure';
  if (segment) {
    const call = calls.find((call) => call.key === `${segment.id}-${suffix}`) ?? null;

    if (call) {
      related.push(call);
    }
  }
};
/**
 * 🎯 Get the delay calls related to a given stop within a connection prediction context.
 * @param {PredictionContext} context ➡️ The connection prediction context containing delay predictions and route stops.
 * @param {$RouteStopEntry} stop ➡️ The stop for which to get the related delay calls.
 * @returns {ConnectionDelayCall[]} 📤 The delay calls related to the stop, or an empty array if not available.
 */
export const getRelatedDelayCalls = (
  context: PredictionContext,
  stop: $RouteStopEntry,
): ConnectionDelayCall[] => {
  const { delayPrediction, routeStops } = context;
  if (!stop) return [];

  if (!delayPrediction) {
    return [];
  }

  const related: ConnectionDelayCall[] = [];
  const incomingSegment = getTransitIncomingSegment(routeStops, stop);
  const outgoingSegment = getTransitOutgoingSegment(routeStops, stop);

  getRelated('incoming', related, incomingSegment, delayPrediction.calls);
  getRelated('outgoing', related, outgoingSegment, delayPrediction.calls);

  return related;
};

export class ConnectionPredictionService implements ConnectionPrediction {
  readonly #getContext: () => PredictionContext;

  constructor(getContext: () => PredictionContext) {
    this.#getContext = getContext;
  }

  getPredictionTone = (stop: RouteStopEntry): PredictionTone => getPredictionTone(this.#getContext(), stop);
  getRelatedDelayCalls = (stop: RouteStopEntry): ConnectionDelayCall[] => getRelatedDelayCalls(this.#getContext(), stop);
  getStopPredictionLabel = (stop: RouteStopEntry): string | null => getStopPredictionLabel(this.#getContext(), stop);
  getStopPredictionTitle = (stop: RouteStopEntry): string | null => getStopPredictionTitle(this.#getContext(), stop);
  getStopPredictionValue = (stop: RouteStopEntry): string | null => getStopPredictionValue(this.#getContext(), stop);
  getTransferAssessment = (stop: RouteStopEntry): $ConnectionTransferAssessment =>
    getTransferAssessment(this.#getContext(), stop);
}

export const createConnectionPrediction = (
  getContext: () => PredictionContext,
): ConnectionPrediction => new ConnectionPredictionService(getContext);

export const useConnectionPrediction = (
  delayPrediction: ComputedRef<ConnectionDelayPrediction | null | undefined>,
  routeStops: ComputedRef<RouteStopEntry[]>,
): ConnectionPrediction => {
  const { t } = useI18n();

  return createConnectionPrediction(() => ({
    delayPrediction: delayPrediction.value,
    routeStops: routeStops.value,
    t,
  }));
};
