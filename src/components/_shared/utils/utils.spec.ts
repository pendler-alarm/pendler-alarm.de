import { checkVisibility, getLabel } from './utils';

describe('getLabel()', () => {
    const FN = getLabel;
    it('should return the label for default type', () => {
        expect(FN('default', 'testLabel')).toBe('testLabel');
    });

    it('should return the translated label for non-default type', () => {
        expect(FN('connection', 'departureLabel')).toBe('Abfahrt');
    });
});
describe('checkVisibility()', () => {
    const FN = checkVisibility;
    it('should return true if show is true', () => {
        const props = { show: true };
        expect(FN(props)).toBe(true);
    });

    it('should return true if any optional property is true', () => {
        const props = { show: false, optional1: true };
        expect(FN(props, ['optional1'])).toBe(true);
    });

    it('should return false if show is false and no optional properties are true', () => {
        const props = { show: false, optional1: false };
        expect(FN(props, ['optional1'])).toBe(false);
    });

});