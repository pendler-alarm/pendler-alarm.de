import { describe, expect, it } from 'vitest';
import { normalizeFilePath } from './normalize';

describe('normalizeFilePath()', () => {
    const FN = normalizeFilePath;
    const ICON_NAME = 'material/event';
    it('should remove leading slashes', () => {
        expect(FN(ICON_NAME)).toEqual(ICON_NAME);
        expect(FN(`///${ICON_NAME}`)).toEqual(ICON_NAME);
    });
    it('should remove leading ./', () => {
        expect(FN(`./${ICON_NAME}`)).toEqual(ICON_NAME);
        expect(FN(`.//${ICON_NAME}`)).toEqual(ICON_NAME);
    });
    it('should remove trailing .svg', () => {
        expect(FN(`${ICON_NAME}.svg`)).toEqual(ICON_NAME);
        expect(FN(`./${ICON_NAME}.svg`)).toEqual(ICON_NAME);
        expect(FN(`/${ICON_NAME}.svg`)).toEqual(ICON_NAME);
        expect(FN(`/${ICON_NAME}.txt`)).toEqual(ICON_NAME);
    });
});
