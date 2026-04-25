import type { RouteStopEntry } from '../ConnectionRouteDetail/ConnectionRouteDetail.d';
import type {
    ConnectionDelayCall,
    ConnectionDelayPrediction,
    ConnectionSegment,
    ConnectionTransferAssessment,
} from '@/features/motis/routing-service.d';

const t = (key: string, params?: Record<string, unknown>): string => (
    params?.value ? `${key}: ${String(params.value)}` : key
);

const createSegment = (id: string, productType: ConnectionSegment['productType']): ConnectionSegment => ({
    id,
    productType,
    productLabel: productType,
    lineLabel: id,
    fromStop: `${id} from`,
    fromStopId: null,
    fromCoordinates: null,
    toStop: `${id} to`,
    toStopId: null,
    toCoordinates: null,
    departureIso: '2026-04-23T08:00:00.000Z',
    departureTime: '08:00',
    arrivalIso: '2026-04-23T08:10:00.000Z',
    arrivalTime: '08:10',
});

const createCall = (key: string, probabilityLate: number): ConnectionDelayCall => ({
    key,
    stopName: key,
    stopId: null,
    serviceLabel: key,
    eventType: key.endsWith('departure') ? 'departure' : 'arrival',
    plannedIso: null,
    likelyIso: null,
    expectedDelayMinutes: null,
    mostLikelyDelayMinutes: null,
    p50DelayMinutes: null,
    p90DelayMinutes: null,
    probabilityLate,
    distribution: [],
});

const createTransferAssessment = (
    incomingSegmentId: string,
    outgoingSegmentId: string,
    successProbability: number,
): ConnectionTransferAssessment => ({
    key: `${incomingSegmentId}-${outgoingSegmentId}`,
    fromStopName: incomingSegmentId,
    toStopName: outgoingSegmentId,
    incomingSegmentId,
    outgoingSegmentId,
    transferMinutes: null,
    successProbability,
    missedProbability: 1 - successProbability,
    arrivalExpectedDelayMinutes: null,
    arrivalP50DelayMinutes: null,
    arrivalP90DelayMinutes: null,
    departureExpectedDelayMinutes: null,
    departureP50DelayMinutes: null,
    departureP90DelayMinutes: null,
});

const createDelayPrediction = (
    calls: ConnectionDelayCall[],
    transferAssessments: ConnectionTransferAssessment[],
): ConnectionDelayPrediction => ({
    likelyConnection: null,
    expectedDepartureDelayMinutes: null,
    expectedArrivalDelayMinutes: null,
    p50DepartureDelayMinutes: null,
    p50ArrivalDelayMinutes: null,
    p90DepartureDelayMinutes: null,
    p90ArrivalDelayMinutes: null,
    probabilityArrivalLate: null,
    calls,
    transferAssessments,
    mobilityHubRadiusMeters: null,
    originMobilityHubs: null,
    destinationMobilityHubs: null,
    historyAvailable: false,
    historyNote: null,
});

const train1 = createSegment('train-1', 'sbahn');
const walk = createSegment('walk-1', 'walk');
const train2 = createSegment('train-2', 'ubahn');

export const STOPS: RouteStopEntry[] = [
    {
        key: 'start',
        kind: 'start',
        name: 'Start',
        minuteOffset: 0,
        arrivalTime: null,
        departureTime: '08:00',
        incomingSegment: null,
        outgoingSegment: train1,
    },
    {
        key: 'transfer-walk-start',
        kind: 'stop',
        name: 'Transfer A',
        minuteOffset: 10,
        arrivalTime: '08:10',
        departureTime: '08:11',
        incomingSegment: train1,
        outgoingSegment: walk,
    },
    {
        key: 'transfer-walk-end',
        kind: 'stop',
        name: 'Transfer B',
        minuteOffset: 14,
        arrivalTime: '08:14',
        departureTime: '08:15',
        incomingSegment: walk,
        outgoingSegment: train2,
    },
    {
        key: 'end',
        kind: 'end',
        name: 'End',
        minuteOffset: 25,
        arrivalTime: '08:25',
        departureTime: null,
        incomingSegment: train2,
        outgoingSegment: null,
    },
];

export const delayPrediction = createDelayPrediction(
    [
        createCall('train-1-departure', 0.1),
        createCall('train-1-arrival', 0.2),
        createCall('train-2-departure', 0.3),
        createCall('train-2-arrival', 0.7),
    ],
    [createTransferAssessment('train-1', 'train-2', 0.82)],
);

export const context = {
    delayPrediction,
    routeStops: STOPS,
    t,
};

export const noTransferContext = {
    ...context,
    delayPrediction: createDelayPrediction(delayPrediction.calls, []),
};