// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChipItem from './ChipItem.vue';

describe('render ChipItem', () => {
  it('renders emoji, label and value inside a chip', () => {
    const wrapper = mount(ChipItem, {
      props: {
        chipType: 'white',
        emoji: '⏱️',
        label: 'duration',
        type: 'connection',
        value: '42 min',
      },
    });

    expect(wrapper.find('.chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('⏱️');
    expect(wrapper.text()).toContain('Travel');
    expect(wrapper.text()).toContain('42 min');
  });
  it('renders label and labelProps inside a chip', () => {
    const wrapper = mount(ChipItem, {
      props: {
        chipType: 'white',
        label: 'bufferEffective',
        labelProps: { count: 42 },
        type: 'connection'
      },
    });

    expect(wrapper.find('.chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('Effective 42 min buffer');
  });
});
