import type { ConnectionDelayCall } from '@/features/motis/routing-service.d';
import type { RouteStopEntry } from '../ConnectionRouteDetail/ConnectionRouteDetail.d';
import {
  getPredictionProbability,
  getPredictionTone,
  getPredictionType,
  getRelated,
  getRelatedDelayCalls,
  getStopPredictionLabel,
  getStopPredictionTitle,
  getStopPredictionValue,
  getTransferAssessment,
  getTransferTone,
} from './prediction';
import { context, delayPrediction, noTransferContext, STOPS } from './prediction.mock';

describe('✅ getTransferTone()', () => {
  const FN = getTransferTone;

  it('should resolve tones for direct tests', () => {
    expect(FN(0.1)).toEqual('bad');
    expect(FN(0.5)).toEqual('warn');
    expect(FN(0.8)).toEqual('good');
    expect(FN(null)).toEqual('neutral');
  });
});
describe('✅ getTransferAssessment()', () => {
  const FN = getTransferAssessment;
  it('should resolve transfer assessments for direct tests', () => {
    expect(FN(context, STOPS[0])?.successProbability).toEqual(undefined);
    expect(FN(context, STOPS[1])?.successProbability).toEqual(0.82);
    expect(FN(context, STOPS[3])?.successProbability).toEqual(undefined);
  });
  it('should resolve null if no delay prediction exists', () => {
    expect(FN({ ...context, delayPrediction: null }, STOPS[1])).toEqual(null);
  });
  it('should resolve null if stop not exists', () => {
    expect(FN(context, STOPS[4])).toEqual(null);
  });
});
describe('✅ getPredictionProbability()', () => {
  const FN = getPredictionProbability;

  it('should resolve probabilities for direct tests', () => {
    expect(FN(context, STOPS[0])).toEqual(0.1);
    expect(FN(context, STOPS[1])).toEqual(0.82);
    expect(FN(context, STOPS[3])).toEqual(0.7);
    expect(FN(context, STOPS[4])).toEqual(null);
  });
  it('should resolve null if no delay prediction exists', () => {
    expect(FN({ ...context, delayPrediction: null }, STOPS[1])).toEqual(null);
  });
  it('should resolve null if stop not exists', () => {
    expect(FN(context, undefined)).toEqual(null);
  });
  it('should resolve null if no result in primary delay call', () => {
    const stop0 = STOPS[0] as RouteStopEntry;
    const stopWithoutDelayCall = {
      ...stop0,
      key: 'start-without-delay-call',
      outgoingSegment: { ...stop0.outgoingSegment, id: 'missing-train' },
    } as RouteStopEntry;

    expect(FN(context, stopWithoutDelayCall)).toEqual(null);
  });
});
describe('✅ getPredictionType()', () => {
  const FN = getPredictionType;

  it('should resolve types for direct tests', () => {
    expect(FN(0.1)).toEqual('good');
    expect(FN(0.2)).toEqual('good');
    expect(FN(0.4)).toEqual('warn');
    expect(FN(0.5)).toEqual('warn');
    expect(FN(0.7)).toEqual('bad');
    expect(FN(null)).toEqual('neutral');
  });
});
describe('✅ getPredictionTone()', () => {
  const FN = getPredictionTone;

  it('should resolve tones for direct tests', () => {
    expect(FN(context, STOPS[0])).toEqual('good');
    expect(FN(context, STOPS[1])).toEqual('good');
    expect(FN(context, STOPS[3])).toEqual('bad');
    expect(FN(context, STOPS[4])).toEqual('neutral');
  });
});
describe('✅ getStopPredictionLabel()', () => {
  const FN = getStopPredictionLabel;
  const ctx = 'views.dashboard.events.connection';

  it('should resolve labels for direct tests', () => {
    expect(FN(context, STOPS[0])).toEqual(`${ctx}.departureProbabilityShort: 10 %`);
    expect(FN(context, STOPS[1])).toEqual(`${ctx}.transferPossibleShort: 82 %`);
    expect(FN(context, STOPS[2])).toEqual(`${ctx}.transferPossibleShort: 82 %`);
    expect(FN(context, STOPS[3])).toEqual(`${ctx}.arrivalProbabilityShort: 70 %`);
  });
  it('should not resolve if context is missing or stop', () => {
    expect(FN(context, undefined)).toEqual(null);
    expect(FN(noTransferContext, STOPS[4])).toEqual(null);
  });
});
describe('✅ getStopPredictionTitle()', () => {
  const FN = getStopPredictionTitle;
  const ctx = 'views.dashboard.events.connection';

  it('should resolve titles for direct tests', () => {
    expect(FN(context, STOPS[0])).toEqual(`${ctx}.departureProbabilityLabel`);
    expect(FN(context, STOPS[1])).toEqual(`${ctx}.transferPossibleLabel`);
    expect(FN(context, STOPS[2])).toEqual(`${ctx}.transferPossibleLabel`);
    expect(FN(context, STOPS[3])).toEqual(`${ctx}.arrivalProbabilityLabel`);
  });
  it('should not resolve if context is missing or stop', () => {
    expect(FN(context, undefined)).toEqual(null);
  });
});
describe('✅ getStopPredictionValue()', () => {
  const FN = getStopPredictionValue;

  it('should resolve values for direct tests', () => {
    expect(FN(context, STOPS[0])).toEqual('10 %');
    expect(FN(context, STOPS[1])).toEqual('82 %');
    expect(FN(context, STOPS[3])).toEqual('70 %');
  });
});
describe('✅ getRelated()', () => {
  const FN = getRelated;
  const calls = delayPrediction.calls;
  const stop = STOPS[3] as RouteStopEntry;

  it('should push the matching incoming call into related', () => {
    const related: ConnectionDelayCall[] = [];

    FN('incoming', related, stop.incomingSegment, calls);
    expect(related.map((call) => call.key)).toEqual(['train-2-arrival']);
  });
  it('should push the matching outgoing call into related', () => {
    const related: ConnectionDelayCall[] = [];

    FN('outgoing', related, stop.outgoingSegment, calls);
    expect(related.map((call) => call.key)).toEqual([]);
  });
  it('should not push if no matching call exists', () => {
    const related: ConnectionDelayCall[] = [];
    const stopWithoutCall = { ...stop, incomingSegment: { ...stop.incomingSegment, id: 'missing-train' } } as RouteStopEntry;

    FN('incoming', related, stopWithoutCall.incomingSegment, calls);
    expect(related).toEqual([]);
  });
});
describe('✅getRelatedDelayCalls()', () => {
  const FN = getRelatedDelayCalls;

  it('should resolve related calls for direct tests', () => {
    expect(FN(context, STOPS[1]).map((call) => call.key)).toEqual([
      'train-1-arrival',
      'train-2-departure',
    ]);
  });
  it('should resolve an empty array if no delay prediction exists', () => {
    expect(FN({ ...context, delayPrediction: null }, STOPS[1])).toEqual([]);
  });
  it('should resolve an empty array if stop not exists', () => {
    expect(FN(context, undefined)).toEqual([]);
  });
});



