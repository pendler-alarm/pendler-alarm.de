import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SvgIcon from './SvgIcon.vue';

describe('SvgIcon', () => {
  it('renders an inline svg for a known icon', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/place',
        dimension: 24,
      },
    });

    const svg = wrapper.get('svg');

    expect(svg.attributes('width')).toBe('24');
    expect(svg.attributes('height')).toBe('24');
  });

  it('prefers explicit width and height over the shared dimension', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/place',
        dimension: 24,
        width: 30,
        height: 18,
      },
    });

    const svg = wrapper.get('svg');

    expect(svg.attributes('width')).toBe('30');
    expect(svg.attributes('height')).toBe('18');
  });

  it('renders the fallback label when the icon is missing', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/does-not-exist',
        fallbackText: 'db',
        width: 32,
        height: 20,
      },
    });

    const fallback = wrapper.get('.svg-icon--fallback');

    expect(fallback.text()).toBe('db');
    expect(wrapper.find('svg').exists()).toBe(false);
    expect(fallback.attributes('style')).toContain('width: 32px;');
    expect(fallback.attributes('style')).toContain('height: 20px;');
  });
});
