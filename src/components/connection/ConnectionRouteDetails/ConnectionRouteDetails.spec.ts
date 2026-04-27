import { normalizeComparableText, normalizeOperatorLabel } from '../ConnectionRouteDetail/ConnectionRouteDetail';

describe('normalizeComparableText()', () => {
    it('should normalize text', () => {
        const FN = normalizeComparableText;
        expect(FN('Meine Straße - hier.')).toEqual('meinestraßehier');
    });
});
describe('normalizeOperatorLabel()', () => {
    const FN = normalizeOperatorLabel;
    it('should normalize operator name', () => {
        const FALLBACK = 'DB';
        const TERM = 'Deutsche Bahn';
        expect(FN(null, FALLBACK)).toEqual(FALLBACK); // fallback
        expect(FN(FALLBACK, FALLBACK)).toEqual(FALLBACK); // uppercase
        expect(FN(TERM, FALLBACK)).toEqual(TERM); // uppercase
        expect(FN('deutsche bahn', FALLBACK)).toEqual(TERM); // uppercase
        expect(FN('Deutsche_Bahn', FALLBACK)).toEqual(TERM); // remove _
        expect(FN(' Deutsche_Bahn ', FALLBACK)).toEqual(TERM); // trim
        expect(FN('Deutsche_Bahn-.', FALLBACK)).toEqual(`${TERM} .`); // TODO Bug wegen Punkt
    });
});