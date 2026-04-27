import { translate } from '@/i18n';
import { SHORTCUTS } from './utils.config';
import type { $string, STYLES_CONFIG } from './utils.d';
import type { VNode } from 'vue';
import { Fragment } from 'vue';
import type { LINK, StyledItemProps } from '@/components/Item/Item.d';

type PropertyContainer = Record<string, unknown>;
type VisibilityProps = PropertyContainer & { show?: boolean };
type LabelProps = PropertyContainer & {
    label?: string | null;
    labelProps?: Record<string, unknown> | null;
    type?: string | null;
};
type LinkProps = PropertyContainer & {
    emoji?: string | null;
    link?: Partial<LINK> | null;
};
type NestedPropertyContainer = Record<string, unknown>;
type StyledProps = PropertyContainer & {
    labelStyle?: StyledItemProps | null;
    css?: string | null;
};

const isRecord = (value: unknown): value is NestedPropertyContainer =>
    typeof value === 'object' && value !== null;

export const getLabel = (type: string, label: string, labelProps: Record<string, unknown> = {}) => {
    if (type === 'default') {
        return label;
    }
    const key = SHORTCUTS[type] ? `${SHORTCUTS[type]}.${label}` : `${label}`;
    const result = translate(key, labelProps);
    const isTranslated = result !== key;
    return isTranslated ? result : label;
};

export const checkVisibility = (props: VisibilityProps, optional: string[] = []) => {
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
export const getValue = (props: PropertyContainer, optional: string[] = []): $string => {
    let result = null;
    for (const keys of optional) {
        const subKeys = keys.split('.');
        if (subKeys.length === 1) {
            const key: $string = subKeys[0];
            const value = key ? props[key] : null;
            if (typeof value === 'string' && value) {
                result = value;
                break;
            }
        } else if (subKeys.length === 2) {
            const key: $string = subKeys[0];
            const subKey: $string = subKeys[1];
            const value = key ? props[key] : null;
            if (subKey && isRecord(value)) {
                const nestedValue = value[subKey];
                if (typeof nestedValue === 'string' && nestedValue) {
                    result = nestedValue;
                    break;
                }
            }
        }
    };
    return result;
};

export const getStyles = (props: StyledProps, styleConfig: STYLES_CONFIG) => {
    const styles = props.labelStyle || {};
    const customCSS = props?.css || '';
    const keys = Object.keys(styles);
    let css = customCSS;
    for (const key of keys) {
        const className = styleConfig[key];
        if (styles[key as keyof StyledItemProps] && className) {
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

export const isLinkText = (props: LinkProps): string[] => {
    const link = props.link;
    if (link?.text) {
        return ['link.text'];
    }
    if (!props.link?.text && !props.emoji && link?.href) {
        return ['link.href'];
    }
    return [];
};
export const getType = (props: { type?: string | null }): string => {
    return props.type || 'default';
};
export const getLabelByType = (props: LabelProps) => {
    const resolvedType = getType(props);
    return getLabel(resolvedType, props.label || '', props.labelProps || {});
};
export const isVisibleLink = (link: LINK): boolean => {
    return link && !link.noLink && link.href ? true : false;
};
export const getTypeByConfig = <TypeKey extends string>(
    props: { type?: TypeKey | null },
    config: Record<TypeKey, unknown>,
): TypeKey => {
    const type = props.type;
    return type && type in config ? type : 'default' as TypeKey;
};
