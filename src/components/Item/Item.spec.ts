// @vitest-environment jsdom

import Item from './Item.vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import type { LINK } from './Item.d';

vi.mock('@/i18n', () => ({
    translate: (key: string, values: Record<string, unknown> = {}) => {
        const messages: Record<string, string> = {
            aLabel: 'someOtherLabel',
            aPlaceholderLabel: 'some {value} Label',
            'views.dashboard.events.connection.mobility': 'Mobilität',
        };
        const template = messages[key] ?? key;

        return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values[token] ?? `{${token}}`));
    },
}));

const href = 'https://example.com';
const type = 'lorem';
const label = 'someLabel';
// const label = 'someLabel'; // TODO: connection
const labelStyle = { bold: true, italic: true, underline: true };
const labelProps = { value: '5' };
const value = '5 min';
const text = 'someText';
const css = 'foobar';
const link: LINK = { href, text: 'linkText' };
const emoji = '🚗';

describe('render Item.vue', () => {
    it('renders nothing', () => {
        const props = { type };
        const wrapper = mount(Item, { props });

        expect(wrapper.text()).toContain('');
        expect(wrapper.find('.chip').exists()).toEqual(false);
    });
    it('renders value', () => {
        const props = {
            value,
            css
        };
        const wrapper = mount(Item, { props });

        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(TEXT.text()).toEqual(value);
        expect(TYPE.attributes('data-item-type')).toEqual('default');
    });
    it('renders text', () => {
        const props = {
            text,
            css
        };
        const wrapper = mount(Item, { props });

        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(TEXT.text()).toEqual(text);
        expect(TYPE.attributes('data-item-type')).toEqual('default');
    });
    it('renders plain label and value', () => {
        const props = {
            label,
            value,
            type,
            css,
        };
        const wrapper = mount(Item, { props });

        const LABEL = wrapper.find('[data-type="label"]');
        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');
        expect(TEXT.text()).toEqual(value);
        expect(LABEL.text()).toEqual(label);
        expect(LABEL.attributes('class')).toEqual(css);
        expect(TYPE.attributes('data-item-type')).toEqual(type);
    });
    it('renders styled label and value', () => {
        const props = {
            label,
            value,
            type,
            css,
            labelStyle,
        };
        const wrapper = mount(Item, { props });

        const LABEL = wrapper.find('[data-type="label"]');
        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(TEXT.text()).toEqual(value);
        expect(LABEL.text()).toEqual('someLabel');
        expect(LABEL.attributes('class')).toEqual(`${css} fw-bold fst-italic text-decoration-underline`);
        expect(TYPE.attributes('data-item-type')).toEqual(type);
    });
    it('renders translated label and value', () => {
        const props = {
            label: 'aLabel',
            value,
            type,
            css,
            labelStyle,
        };
        const wrapper = mount(Item, { props });

        const LABEL = wrapper.find('[data-type="label"]');
        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(TEXT.text()).toEqual(value);
        expect(LABEL.text()).toEqual('someOtherLabel');
        expect(LABEL.attributes('class')).toEqual(`${css} fw-bold fst-italic text-decoration-underline`);
        expect(TYPE.attributes('data-item-type')).toEqual(type);
    });
    it('renders label, labelProps', () => {
        const props = {
            label: 'aPlaceholderLabel',
            labelProps,
            type,
        };
        const wrapper = mount(Item, { props });

        const LABEL = wrapper.find('[data-type="label"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(LABEL.text()).toEqual('some 5 Label');
        expect(TYPE.attributes('data-item-type')).toEqual(type);
    });
    it('renders label from shortcut', () => {
        const props = {
            label: 'mobility',
            labelProps,
            type: 'connection',
        };
        const wrapper = mount(Item, { props });

        const LABEL = wrapper.find('[data-type="label"]');
        const TYPE = wrapper.find('[data-item-type]');

        expect(LABEL.text()).toEqual('Mobilität');
        expect(TYPE.attributes('data-item-type')).toEqual('connection');
    });
    it('renders link text', () => {
        const props = {
            link,
            emoji,
            css
        };
        const wrapper = mount(Item, { props });

        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');
        const LINK = wrapper.find('a');
        const EMOJI = wrapper.find('[data-type="emoji"]');
        expect(TEXT.text()).toEqual(link.text);
        expect(LINK.exists()).toEqual(true);
        expect(EMOJI.text()).toEqual(emoji);
        expect(LINK.attributes('href')).toEqual(href);
        expect(LINK.attributes('target')).toEqual('_blank');
        expect(LINK.attributes('rel')).toEqual('noopener noreferrer');
        expect(TYPE.attributes('data-item-type')).toEqual('default'); // TODO: should this be default or link?
    });
    it('renders link href with href as label', () => {
        const props = {
            link: { href } as LINK,
        };
        const wrapper = mount(Item, { props });

        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');
        const LINK = wrapper.find('a');
        expect(TEXT.text()).toEqual(link.href);
        expect(LINK.exists()).toEqual(true);
        expect(TYPE.attributes('data-item-type')).toEqual('default'); // TODO: should this be default or link?
    });
    it('renders link href with emoji as label', () => {
        const props = {
            emoji,
            link: { href } as LINK,
        };
        const wrapper = mount(Item, { props });
        const EMOJI = wrapper.find('[data-type="emoji"]');
        const TEXT = wrapper.find('[data-type="text"]');
        const TYPE = wrapper.find('[data-item-type]');
        const LINK = wrapper.find('a');
        expect(EMOJI.text()).toEqual(emoji);
        expect(TEXT.exists()).toEqual(false);
        expect(LINK.exists()).toEqual(true);
        expect(TYPE.attributes('data-item-type')).toEqual('default'); // TODO: should this be default or link?
    });
});
