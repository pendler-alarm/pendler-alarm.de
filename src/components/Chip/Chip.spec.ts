// @vitest-environment jsdom

import { getChipTypeConfig, getLabel, getConfigClassName, toChipLabelKey, getClassNames, getLinkAttributes } from './Chip';
import Chip from './Chip.vue';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { setLocale } from '@/i18n';
import type { ChipType } from './Chip.d';

const href = 'https://example.com';

describe('render Chip.vue', () => {
    const global = {
        plugins: [
            createI18n({
                legacy: false,
                locale: 'de',
                messages: {},
            }),
        ],
    };
    it('renders nothing', () => {
        const wrapper = mount(Chip, {
            props: {
                type: 'connection',
            },
            global,
        });

        expect(wrapper.text()).toContain('');
        expect(wrapper.find('.chip').exists()).toBe(false);
    });
    it('renders text chip', () => {
        const wrapper = mount(Chip, {
            props: {
                text: '5 min',
                type: 'connection',
                class: 'foobar',
            },
            global,
        });
        const span = wrapper.find('span');
        expect(wrapper.text()).toContain('5 min');
        expect(wrapper.find('.chip').exists()).toBe(true);
        expect(span.attributes('class')).toBe('chip chip--default foobar');
    });
    it('renders emoji chip', () => {
        const wrapper = mount(Chip, {
            props: {
                emoji: '🚌',
                type: 'connection',
                text: 'Bus',
            },
            global,
        });
        const span = wrapper.find('span');
        expect(wrapper.text()).toContain('🚌Bus'); // TODO: sollte space haben
        expect(wrapper.find('.chip__emoji').exists()).toBe(true);
        expect(span.attributes('class')).toBe('chip chip--default');
    });
    it('renders custom slot content', () => {
        const wrapper = mount(Chip, {
            props: {
                type: 'connection',
            },
            slots: {
                custom: '<strong>Custom content</strong>',
            },
            global,
        });

        expect(wrapper.find('.chip').exists()).toBe(true);
        expect(wrapper.find('strong').text()).toBe('Custom content');
        expect(wrapper.find('div.chip').exists()).toBe(true);
    });
    it('does not render for empty custom slot content', () => {
        const wrapper = mount(Chip, {
            props: {
                type: 'connection',
            },
            slots: {
                custom: '   ',
            },
            global,
        });

        expect(wrapper.find('.chip').exists()).toBe(false);
    });
    it('renders link chip', () => {
        const wrapper = mount(Chip, {
            props: {
                text: 'Google',
                type: 'link',
                link: {
                    href,
                },
            },
            global,
        });
        expect(wrapper.text()).toContain('Google');
        const link = wrapper.find('a.chip');
        expect(link.exists()).toBe(true);
        expect(link.attributes('href')).toBe(href);
        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toBe('noreferrer noopener');
        expect(link.attributes('class')).toBe('chip chip--link chip--interactive');
    });
});

describe('toChipLabelKey()', () => {
    const FN = toChipLabelKey;
    beforeEach(() => {
        setLocale('de');
    });
    it('returns the resolved label from the config if it exists', () => {
        const result = FN('connection', 'transferStationChange');
        expect(result).toEqual('Umstieg mit Haltestellenwechsel');
    });
    it('returns the resolved label from the full key if it exists', () => {
        const result = FN('default', 'views.dashboard.events.connection.transferStationChange');
        expect(result).toEqual('Umstieg mit Haltestellenwechsel');
    });
    it('returns undefined if the label key does not exist in the config', () => {
        const result = FN('default', 'a standard label');
        expect(result).toEqual('a standard label');
    });
});
describe('getConfigClassName()', () => {
    const FN = getConfigClassName;
    it('returns the class name from the config for a valid chip type', () => {
        const result = FN('good');
        expect(result).toBe('chip--good');
    });
    it('returns "default" for an invalid chip type', () => {
        const result = FN('nonexistent' as ChipType);
        expect(result).toBe('chip--default');
    });
});
describe('getLinkAttributes()', () => {
    const FN = getLinkAttributes;

    it('returns the correct attributes for a valid link', () => {
        const result = FN({ href, target: '_self', rel: 'nofollow' });
        expect(result).toEqual({
            href,
            target: '_self',
            rel: 'nofollow',
        });
    });
    it('returns default target and rel if not provided', () => {
        const result = FN({ href });
        expect(result).toEqual({
            href,
            target: '_blank',
            rel: 'noreferrer noopener',
        });
    });
    it('returns an empty object if link is null', () => {
        const result = FN(null);
        expect(result).toEqual({});
    });
});
describe('getClassNames()', () => {
    const FN = getClassNames;
    it('returns the correct class names for a non-link chip', () => {
        const result = FN('good', false, 'additional');
        expect(result).toEqual(['chip', 'chip--good', 'additional']);
    });
    it('returns the correct class names for a link chip', () => {
        const result = FN('good', true, 'additional');
        expect(result).toEqual(['chip', 'chip--good', 'chip--interactive', 'additional']);
    });
    it('filters out falsy values', () => {
        const result = FN('good', false, null);
        expect(result).toEqual(['chip', 'chip--good']);
    });
});
describe('getChipTypeConfig()', () => {
    const FN = getChipTypeConfig;
    it('returns the config for a valid chip type', () => {
        const result = FN('good');
        expect(result).toEqual({
            className: 'chip--good',
        });
    });
    it('returns the default config for an invalid chip type', () => {
        const result = FN('nonexistent' as ChipType);
        expect(result).toEqual({
            className: 'chip--default',
        });
    });
});
describe('getLabel()', () => {
    const FN = getLabel;
    beforeEach(() => {
        setLocale('de');
    });

    it('returns the text prop if it exists', () => {
        const result = FN('default', { text: 'Hello' });
        expect(result).toBe('Hello');
    });
    it('returns the link text if text prop does not exist', () => {
        const result = FN('default', { link: { href, text: 'Example' } });
        expect(result).toBe('Example');
    });
    it('returns the resolved label from the config if labelKey exists', () => {
        setLocale('de');
        const result = FN('connection', { labelKey: 'transferStationChange' });
        expect(result).toBe('Umstieg mit Haltestellenwechsel');
    });
    it('returns an empty string if no text, link text or labelKey is provided', () => {
        const result = FN('default', {});
        expect(result).toBe('');
    });

});
