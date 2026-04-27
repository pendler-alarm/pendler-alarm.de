// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { checkVisibility, getLabel, getLabelByType, getStyles, getType, getTypeByConfig, getValue, hasRenderableSlotContent, isLinkText, isVisibleLink } from './utils';
import { createTextVNode, defineComponent, Fragment, h, type VNode } from 'vue';
import { vi } from 'vitest';
import type { LINK } from '@/components/Item/Item';

vi.mock('@/i18n', () => ({
    translate: (key: string, values: Record<string, unknown> = {}) => {
        const messages: Record<string, string> = {
            aLabel: 'someOtherLabel',
            aPlaceholderLabel: 'some {placeholder} Label',
            'views.dashboard.events.connection.mobility': 'Mobilität',
            'views.dashboard.events.connection.departureLabel': 'Departure',
        };
        const template = messages[key] ?? key;

        return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values[token] ?? values.placeholder ?? `{${token}}`));
    },
}));

const getCustomSlotNodes = (custom: string): VNode[] => {
    let nodes: VNode[] = [];

    mount(
        defineComponent({
            setup(_, { slots }) {
                nodes = slots.custom?.() ?? [];
                return () => slots.custom?.();
            },
        }),
        {
            slots: {
                custom,
            },
        },
    );

    return nodes;
};

describe('getLabel()', () => {
    const FN = getLabel;
    it('should return the label for default type', () => {
        expect(FN('default', 'testLabel')).toEqual('testLabel');
    });

    it('should return the translated label for non-default type', () => {
        expect(FN('connection', 'departureLabel')).toEqual('Departure');
    });
});
describe('checkVisibility()', () => {
    const FN = checkVisibility;
    it('should return true if show is true', () => {
        const props = { show: true };
        expect(FN(props)).toEqual(true);
    });

    it('should return true if any optional property is true', () => {
        const props = { show: false, optional1: true };
        expect(FN(props, ['optional1'])).toEqual(true);
    });

    it('should return false if show is false and no optional properties are true', () => {
        const props = { show: false, optional1: false };
        expect(FN(props, ['optional1'])).toEqual(false);
    });
});
describe('getValue()', () => {
    const FN = getValue;
    it('should return the value of the first optional property that is true', () => {
        const props = { optional2: 'value2' };
        expect(FN(props, ['optional1', 'optional2'])).toEqual('value2');
    });
    it('should return the nested value of the first optional property that is true', () => {
        const props = { optional2: { link: 'value2' } };
        expect(FN(props, ['optional1', 'optional2.link'])).toEqual('value2');
    });

    it('should return null if no optional properties are true', () => {
        const props = {};
        expect(FN(props, ['optional1', 'optional2'])).toEqual(null);
    });
});
describe('getStyles()', () => {
    const FN = getStyles;
    const styleConfig = { bold: 'bold-css', italic: 'italic-css' };
    it('should return the custom CSS if no styles are true', () => {
        const labelStyle = { bold: false, italic: false };
        const props = { labelStyle, css: 'custom-css' };
        expect(FN(props, styleConfig)).toEqual('custom-css');
    });
    it('should append matching style classes to the custom CSS', () => {
        const labelStyle = { bold: true, italic: false };
        const props = { labelStyle, css: 'custom-css' };
        expect(FN(props, styleConfig)).toEqual('custom-css bold-css');
    });
});
describe('hasRenderableSlotContent()', () => {
    const FN = hasRenderableSlotContent;

    it('should return true if there is at least one non-comment node', () => {
        const nodes = getCustomSlotNodes('<span data-test="custom-slot">Custom Content</span>');
        expect(FN(nodes)).toEqual(true);
    });


    it('should return false if there are only empty text nodes', () => {
        const nodes = getCustomSlotNodes('   ');

        expect(FN(nodes)).toEqual(false);
    });

    it('should return true if there is text content', () => {
        const nodes = getCustomSlotNodes('Custom Content');

        expect(FN(nodes)).toEqual(true);
    });

    it('should return true if there is an element node', () => {
        const nodes = getCustomSlotNodes('<span>Custom Content</span>');

        expect(FN(nodes)).toEqual(true);
    });
    it('should return false if there is a Comment node', () => {
        expect(FN([h(Comment, 'Comment')])).toEqual(false);
    });
    it('should return if there is a Text node', () => {
        expect(FN([h(Text, 'text')])).toEqual(true);
        expect(FN([h(Text, '')])).toEqual(false);
        expect(FN([h(Text, '   ')])).toEqual(false);
    });
    it('should return true if there is a Fragment node with renderable content', () => {
        expect(FN([h(Fragment, [h(Text, 'text')])])).toEqual(true);
    });
    it('should return false if there is a Fragment node without renderable content', () => {
        expect(FN([h(Fragment, [h(Comment, 'Comment')])])).toEqual(false);
    });
    it('should return true if a later node is renderable', () => {
        expect(FN([h(Comment, 'Comment'), h(Text, '   '), h('span', 'content')])).toEqual(true);
    });


    it('should return true for non-empty text nodes', () => {
        expect(FN([createTextVNode('Hello')])).toBe(true);
    });

    it('should return false if there are no nodes', () => {
        expect(FN()).toEqual(false);
        expect(FN([])).toEqual(false);
    });
});
describe('isLinkText()', () => {
    const FN = isLinkText;
    it('should return an array of link text keys if link text is present', () => {
        const props = { link: { text: 'Link Text' } };
        expect(FN(props)).toEqual(['link.text']);
    });

    it('should return an array of link href keys if link text is not present but href is present', () => {
        const props = { link: { href: 'https://example.com' } };
        expect(FN(props)).toEqual(['link.href']);
    });
    it('should return an empty array if neither link text nor href is present', () => {
        const props = { link: {} };
        expect(FN(props)).toEqual([]);
    });
});
describe('getType', () => {
    const FN = getType;
    it('should return the correct type', () => {
        expect(FN({})).toEqual('default');
        expect(FN({ type: 'custom' })).toEqual('custom');
    });
});
describe('getLabelByType()', () => {
    const FN = getLabelByType;
    it('should return the label based on shortcut type "connection"', () => {
        const props = { type: 'connection', label: 'departureLabel' };
        expect(FN(props)).toEqual('Departure');
    });
    it('should return the label based on default type', () => {
        const props = { label: 'Test Label' };
        expect(FN(props)).toEqual('Test Label');
    });
    it('should return a placeholder based label', () => {
        const props = { type: 'custom', label: 'aPlaceholderLabel', labelProps: { placeholder: 2 } };
        expect(FN(props)).toEqual('some 2 Label');
    });
});
describe('isVisibleLink()', () => {
    const FN = isVisibleLink;
    const href = 'https://example.com';
    it('should return true if its a visible link', () => {
        const link: LINK = { href };
        expect(FN(link)).toEqual(true);
    });
    it('should return false if the link has no href', () => {
        const link: LINK = { href, noLink: true };
        expect(FN(link)).toEqual(false);
    });
    it('should return false if the link is explicitly marked as noLink', () => {
        const link: LINK = { href, noLink: true };
        expect(FN(link)).toEqual(false);
    });
    it('should return false if no link object', () => {
        expect(FN({} as LINK)).toEqual(false);
    });
});
describe('getTypeByConfig()', () => {
    const FN = getTypeByConfig;
    const config = { custom: {} };
    it('should return the correct type if it exists in the config', () => {
        expect(FN({ type: 'custom' }, config)).toEqual('custom');
    });
    it('should return default if the type does not exist in the config', () => {
        expect(FN({ type: 'nonexistent' }, config)).toEqual('default');
    });
    it('should return default if no type is provided', () => {
        expect(FN({}, config)).toEqual('default');
    });
});