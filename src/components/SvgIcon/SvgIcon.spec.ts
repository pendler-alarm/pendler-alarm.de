// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SvgIcon from './SvgIcon.vue';
import { addDimension } from './SvgIcon';

describe('render SvgIcon', () => {
  it('renders an svg with the requested dimensions', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/event',
        dimension: 24
      },
    });

    const svg = wrapper.find('svg');

    expect(svg.exists()).toBe(true);
    expect(svg.attributes('width')).toBe('24');
    expect(svg.attributes('height')).toBe('24');
  });
  it('renders a non existing svg', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/not_found',
        dimension: 24
      },
    });

    const svg = wrapper.find('svg');

    expect(svg.exists()).toBe(false);
  });

  it('renders fallback text when the icon is missing', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        icon: 'material/missing',
        fallbackText: 'DB',
        width: 32,
        height: 18,
      },
    });

    expect(wrapper.text()).toBe('DB');
    expect(wrapper.classes()).toContain('svg-icon--fallback');
    expect(wrapper.attributes('style')).toContain('width: 32px;');
    expect(wrapper.attributes('style')).toContain('height: 18px;');
  });

});
describe('addDimension()', () => {
  const FN = addDimension;

  it('adds width and height to an svg string', () => {
    const svg = `<svg width="10" height="10"><rect width="10" height="10" fill="red"/></svg>`;
    const result = FN(svg, 20, 30);
    expect(result).toBe('<svg width="20" height="30"><rect width="10" height="10" fill="red"/></svg>');
  });
});
