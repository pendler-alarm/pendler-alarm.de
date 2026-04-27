// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import ConnectionRouteDetail from './ConnectionRouteDetail.vue';
import type { ConnectionRouteDetailProps } from './ConnectionRouteDetail.d';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: {} },
  missingWarn: false,
  fallbackWarn: false,
});

const createSharingStation = (name: string, mode: 'car' | 'bike') => ({
  stationId: name,
  name,
  lat: 52.52,
  lon: 13.405,
  operator: 'demo_operator',
  capacity: 4,
  realtimeAvailability: [{ key: `${name}-${mode}`, mode, value: '4' }],
});

const createProps = (): ConnectionRouteDetailProps => ({
  stop: {
    contentId: 'connection-route-stop-stop-1',
    key: 'stop-1',
    kind: 'start',
    name: 'Berlin Hbf',
    minuteOffset: 0,
    arrivalTime: null,
    departureTime: '08:00',
    incomingSegment: null,
    outgoingSegment: null,
  },
  predictionTone: 'neutral',
  relatedDelayCalls: [],
  delayPrediction: {
    originMobilityHubs: {
      lat: 52.52,
      lon: 13.405,
      sharingStations: [
        createSharingStation('Car 1', 'car'),
        createSharingStation('Car 2', 'car'),
        createSharingStation('Car 3', 'car'),
        createSharingStation('Car 4', 'car'),
        createSharingStation('Bike 1', 'bike'),
        createSharingStation('Bike 2', 'bike'),
        createSharingStation('Bike 3', 'bike'),
        createSharingStation('Bike 4', 'bike'),
      ],
      parkingSites: [],
    },
    destinationMobilityHubs: null,
  } as ConnectionRouteDetailProps['delayPrediction'],
} as ConnectionRouteDetailProps);

describe('ConnectionRouteDetail', () => {
  it('toggles multiple mobility sections independently on the same view', async () => {
    const wrapper = mount(ConnectionRouteDetail, {
      attachTo: document.body,
      props: createProps(),
      global: {
        plugins: [i18n],
        stubs: {
          Chip: { template: '<div><slot /><slot name="custom" /></div>' },
          Item: { template: '<span><slot /></span>' },
          SvgIcon: { template: '<i class="svg-icon-stub" />' },
          Train: { template: '<div class="train-stub" />' },
        },
      },
    });
    await nextTick();

    expect(wrapper.find('#sharing-stop-1-car').classes()).toContain('expand-toggle-target--collapsed');
    expect(wrapper.find('#sharing-stop-1-bike').classes()).toContain('expand-toggle-target--collapsed');
    expect(wrapper.find('#sharing-stop-1-car').attributes('hidden')).toBeDefined();
    expect(wrapper.find('#sharing-stop-1-bike').attributes('hidden')).toBeDefined();

    const toggles = wrapper.findAll('.expand-toggle');

    await toggles[0]!.trigger('click');

    expect(wrapper.find('#sharing-stop-1-car').classes()).toContain('expand-toggle-target--expanded');
    expect(wrapper.find('#sharing-stop-1-car').attributes('hidden')).toBeUndefined();
    expect(wrapper.find('#sharing-stop-1-bike').classes()).toContain('expand-toggle-target--collapsed');
    expect(wrapper.find('#sharing-stop-1-bike').attributes('hidden')).toBeDefined();

    await toggles[1]!.trigger('click');

    expect(wrapper.find('#sharing-stop-1-car').classes()).toContain('expand-toggle-target--expanded');
    expect(wrapper.find('#sharing-stop-1-bike').classes()).toContain('expand-toggle-target--expanded');
    expect(wrapper.find('#sharing-stop-1-bike').attributes('hidden')).toBeUndefined();
  });
});
