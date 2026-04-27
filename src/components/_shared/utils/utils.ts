import { translate } from '@/i18n';
import { SHORTCUTS } from './utils.config';
import type { $string, STYLES, STYLES_CONFIG } from './utils.d';
import type { VNode } from 'vue';
import { Fragment } from 'vue';
import type { LINK } from '@/components/Item/Item';

export const getLabel = (type: string, label: string, labelProps: Record<string, unknown> = {}) => {
    if (type === 'default') {
        return label;
    }
    const key = SHORTCUTS[type] ? `${SHORTCUTS[type]}.${label}` : `${label}`;
    const result = translate(key, labelProps);
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
export const getValue = (props: any, optional: string[] = []): $string => {
    let result = null;
    for (const keys of optional) {
        const subKeys = keys.split('.');
        if (subKeys.length === 1) {
            const key: $string = subKeys[0];
            if (key && props[key]) {
                result = props[key];
                break;
            }
        } else if (subKeys.length === 2) {
            const key: $string = subKeys[0];
            const subKey: $string = subKeys[1];
            if (key && props[key] && subKey && props[key][subKey]) {
                result = props[key][subKey];
                break;
            }
        }
    };
    return result;
};

export const getStyles = (props: any, styleConfig: STYLES_CONFIG) => {
    const styles = props.labelStyle || {};
    const customCSS = props?.css || '';
    const keys = Object.keys(styles);
    let css = customCSS;
    for (const key of keys) {
        const className = styleConfig[key];
        if (styles[key] && className) {
            css += ` ${className}`;
        }
    }
    return css.trim();
};

export const hasRenderableSlotContent = (nodes: VNode[] = []): boolean => nodes.some((node) => {
    if (node.type === Comment) {
        return false;
    }

    if (node.type === Text) {
        return String(node.children ?? '').trim().length > 0;
    }

    if (node.type === Fragment) {
        return hasRenderableSlotContent(Array.isArray(node.children) ? node.children as VNode[] : []);
    }

    return true;
});

export const isLinkText = (props: any): string[] => {
    const link: LINK = props.link || null;
    if (link?.text) {
        return ['link.text'];
    }
    if (!props.link?.text && !props.emoji && link?.href) {
        return ['link.href'];
    }
    return [];
};
export const getType = (props: any): string => {
    return props.type || 'default';
};
export const getLabelByType = (props: any) => {
    const resolvedType = getType(props);
    return getLabel(resolvedType, props.label || '', props.labelProps || {});
};
export const isVisibleLink = (link: LINK): boolean => {
    return link && !link.noLink && link.href ? true : false;
};
export const getTypeByConfig = (props: any, config: any) => {
    const type = props.type;
    return type && type in config ? type : 'default';
};