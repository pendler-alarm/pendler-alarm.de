// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SetupPromptDialog from './SetupPromptDialog.vue';
import { localStorageStore } from '@/lib/storage';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/storage', () => ({
  localStorageStore: {
    getBoolean: vi.fn(),
    setBoolean: vi.fn(),
  },
}));

const flushRender = async (): Promise<void> => {
  await Promise.resolve();
  await nextTick();
};

const setupBrowserMocks = (standalone: boolean): void => {
  const mediaQueryList = {
    matches: standalone,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue(mediaQueryList),
  });

  Object.defineProperty(window.navigator, 'permissions', {
    configurable: true,
    value: {
      query: vi.fn().mockResolvedValue({ state: 'prompt', onchange: null }),
    },
  });

  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((onSuccess: PositionCallback) => {
        onSuccess({} as GeolocationPosition);
      }),
    },
  });

  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: standalone,
  });
};

describe('SetupPromptDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('default'),
    });
    vi.mocked(localStorageStore.getBoolean).mockReturnValue(true);
    setupBrowserMocks(false);
  });

  it('hides setup prompt when running as standalone PWA', async () => {
    setupBrowserMocks(true);
    const wrapper = mount(SetupPromptDialog);

    await flushRender();

    expect(wrapper.find('.setup-backdrop').exists()).toBe(false);
  });

  it('shows setup prompt in browser context for returning users', async () => {
    setupBrowserMocks(false);
    const wrapper = mount(SetupPromptDialog);

    await flushRender();

    expect(wrapper.find('.setup-backdrop').exists()).toBe(true);
    expect(wrapper.text()).toContain('components.setupPrompt.later');
  });
});
