// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import ExpandToggle from './ExpandToggle.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      components: {
        expandToggle: {
          hideDetails: 'Hide details',
          showDetails: 'Show details',
        },
      },
      views: {
        dashboard: {
          events: {
            connection: {
              mobility: {
                more: 'More',
                showLess: 'Show less',
              },
            },
          },
        },
      },
    },
  },
});

const mountToggle = (props: Record<string, unknown>) => mount(ExpandToggle, {
  props: {
    targetId: 'details',
    ...props,
  },
  global: {
    plugins: [i18n],
    stubs: {
      SvgIcon: {
        template: '<i class="svg-icon-stub" />',
      },
    },
  },
});

describe('ExpandToggle variants', () => {
  it('renders a button with emoji only', () => {
    const wrapper = mountToggle({
      labelMode: 'emoji',
      surfaceMode: 'button',
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.find('.expand-toggle__label').exists()).toBe(false);
    expect(wrapper.attributes('aria-label')).toBe('Show details');
  });

  it('renders a button with text and emoji', () => {
    const wrapper = mountToggle({
      labelMode: 'text+emoji',
      surfaceMode: 'button',
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.find('.expand-toggle__label').text()).toBe('Show details');
  });

  it('renders a plain emoji toggle', async () => {
    document.body.innerHTML = '<div id="details" class="expand-toggle-target expand-toggle-target--collapsed"></div>';
    const wrapper = mountToggle({
      labelMode: 'emoji',
      surfaceMode: 'plain',
    });

    await wrapper.trigger('click');

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.attributes('role')).toBe('button');
    expect(wrapper.find('.expand-toggle__label').exists()).toBe(false);
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(document.getElementById('details')?.classList.contains('expand-toggle-target--expanded')).toBe(true);
  });

  it('renders a plain text and emoji toggle', async () => {
    document.body.innerHTML = '<div id="details" class="expand-toggle-target"></div>';
    const wrapper = mountToggle({
      collapsedLabelKey: 'views.dashboard.events.connection.mobility.more',
      initialExpanded: true,
      expandedLabelKey: 'views.dashboard.events.connection.mobility.showLess',
      labelMode: 'text+emoji',
      surfaceMode: 'plain',
    });

    await wrapper.trigger('keydown', { key: 'Enter' });
    await nextTick();

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.find('.expand-toggle__label').text()).toBe('More');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.emitted('toggle')?.[0]).toEqual([false]);
    expect(document.getElementById('details')?.classList.contains('expand-toggle-target--collapsed')).toBe(true);
  });
});
