import type { RouteStopEntry } from '../../ConnectionRouteDetail/ConnectionRouteDetail.d';
import { STOPS } from '../prediction.mock';
import { getSegmentByDirection, getStopIndex, getTransitIncomingSegment, getTransitOutgoingSegment, isWalk } from './segment';

describe('✅ getStopIndex()', () => {
    const FN = getStopIndex;

    it('should resolve stop indices for direct tests', () => {
        expect(FN(STOPS, STOPS[0] as RouteStopEntry)).toEqual(0);
        expect(FN(STOPS, STOPS[2] as RouteStopEntry)).toEqual(2);
        expect(FN(STOPS, STOPS[3] as RouteStopEntry)).toEqual(3);
        expect(FN(STOPS, STOPS[4] as RouteStopEntry)).toEqual(-1);
    });
});
describe('✅ isWalk()', () => {
    const FN = isWalk;
    const stop1 = STOPS[1] as RouteStopEntry;
    const stop2 = STOPS[2] as RouteStopEntry;

    it('should resolve walk segments for direct tests', () => {
        expect(FN(stop1.outgoingSegment)).toEqual(true);
        expect(FN(stop2.outgoingSegment)).toEqual(false);
    });
});
describe('✅ getSegmentByDirection()', () => {
    const FN = getSegmentByDirection;
    const stop = STOPS[1] as RouteStopEntry;
    it('should resolve segments by direction for direct tests', () => {
        expect(FN(stop, 'incoming')).toEqual(stop.incomingSegment);
        expect(FN(stop, 'outgoing')).toEqual(stop.outgoingSegment);
    });
});
describe('✅ getTransitIncomingSegment()', () => {
    const FN = getTransitIncomingSegment;
    const stop0 = STOPS[0] as RouteStopEntry;
    const stop1 = STOPS[1] as RouteStopEntry;
    const stop2 = STOPS[2] as RouteStopEntry;
    const currentStop = { ...STOPS[2], key: 'single-transfer' } as RouteStopEntry;

    it('should resolve incoming segments for direct tests', () => {
        expect(FN(STOPS, stop0)).toEqual(null);
    });
    it('should get previous if its a walking segment', () => {
        expect(FN(STOPS, stop2)).toEqual(stop1.incomingSegment);
    });
    it('should resolve null if no previous segment exists', () => {
        expect(FN([currentStop], currentStop)).toEqual(null);
    });
    it('should resolve null if the previous stop incoming segment is also walking', () => {
        const previousStop = { ...STOPS[2], key: 'previous-walk-transfer' } as RouteStopEntry;

        expect(FN([previousStop, currentStop], currentStop)).toEqual(null);
    });
});
describe('✅ getTransitOutgoingSegment()', () => {
    const FN = getTransitOutgoingSegment;
    const stop1 = STOPS[1] as RouteStopEntry;
    const stop2 = STOPS[2] as RouteStopEntry;
    const stop3 = STOPS[3] as RouteStopEntry;
    const currentStop = { ...STOPS[1], key: 'single-transfer' } as RouteStopEntry;
    it('should resolve outgoing segments for direct tests', () => {
        expect(FN(STOPS, stop3)).toEqual(null);
    });
    it('should get next if its a walking segment', () => {
        expect(FN(STOPS, stop1)).toEqual(stop2.outgoingSegment);
    });
    it('should resolve null if no next segment exists', () => {
        expect(FN([currentStop], currentStop)).toEqual(null);
    });
    it('should resolve null if the next stop outgoing segment is also walking', () => {
        const nextStop = { ...STOPS[1], key: 'next-walk-transfer' } as RouteStopEntry;

        expect(FN([currentStop, nextStop], currentStop)).toEqual(null);
    });
});