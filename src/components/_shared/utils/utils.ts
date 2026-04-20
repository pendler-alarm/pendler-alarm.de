import { translate } from '@/i18n';
import { SHORTCUTS } from './utils.config';

export const getLabel = (type: string, label: string) => {
    if (type === 'default') {
        return label;
    }
    const key = `${SHORTCUTS[type]}.${label}`;
    const result = translate(key);
    const isTranslated = result !== key;
    return isTranslated ? result : label;
};

export const checkVisibility = (props: any, optional: string[] = []) => {
    let isVisible = false;
    if (props.show) {
        return true;
    }
    for (const key of optional) {
        if (props[key]) {
            isVisible = true;
            break;
        }
    }
    return isVisible;
};