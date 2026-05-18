// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETUP_VISIT_STORAGE_KEY } from '@/features/privacy/privacy';
import SetupPromptDialog from './SetupPromptDialog.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      components: {
        setupPrompt: {
          eyebrow: 'Get set up',
          title: 'Set up the app',
          body: 'Body',
          installTitle: 'Install PWA',
          installCopy: 'Install copy',
          installManualCopy: 'Install manual copy',
          installIosCopy: 'Install iOS copy',
          installAction: 'Install now',
          notificationTitle: 'Notifications',
          notificationCopy: 'Enable notifications',
          notificationAction: 'Allow notifications',
          notificationRetry: 'Try again',
          notificationGranted: 'Notifications enabled',
          later: 'Later',
        },
      },
    },
  },
});

const setupStandaloneState = (standalone: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? standalone : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const setupNotificationPermission = (permission: NotificationPermission): void => {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: {
      permission,
      requestPermission: vi.fn(async () => permission),
    },
  });
};

const mountDialog = async () => {
  const wrapper = mount(SetupPromptDialog, {
    global: {
      plugins: [i18n],
    },
  });
  await flushPromises();
  return wrapper;
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('SetupPromptDialog', () => {
  it('does not show while running as installed standalone app', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');
    setupStandaloneState(true);
    setupNotificationPermission('default');

    const wrapper = await mountDialog();

    expect(wrapper.find('.setup-backdrop').exists()).toBe(false);
  });

  it('shows in browser context after returning visit', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');
    setupStandaloneState(false);
    setupNotificationPermission('default');

    const wrapper = await mountDialog();

    expect(wrapper.find('.setup-backdrop').exists()).toBe(true);
    expect(wrapper.text()).toContain('Set up the app');
  });
});
