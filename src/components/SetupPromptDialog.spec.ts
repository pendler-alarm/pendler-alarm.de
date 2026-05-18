// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
          installTitle: 'Install',
          installCopy: 'Install copy',
          installManualCopy: 'Install manual',
          installIosCopy: 'Install ios',
          installAction: 'Install now',
          notificationTitle: 'Notifications',
          notificationCopy: 'Notification copy',
          notificationGranted: 'Granted',
          notificationAction: 'Allow',
          notificationRetry: 'Retry',
          later: 'Later',
        },
      },
    },
  },
});

const setStandaloneState = (isStandalone: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: isStandalone,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: isStandalone,
  });
};

const mountDialog = () => mount(SetupPromptDialog, {
  global: {
    plugins: [i18n],
  },
});

describe('SetupPromptDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandaloneState(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render while running in standalone mode', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');
    setStandaloneState(true);

    const wrapper = mountDialog();
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('renders after a revisit in browser mode', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');

    const wrapper = mountDialog();
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('renders after beforeinstallprompt even on the first visit', async () => {
    const wrapper = mountDialog();
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    window.dispatchEvent(new Event('beforeinstallprompt'));
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });
});
