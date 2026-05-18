// @vitest-environment jsdom

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import SetupPromptDialog from './SetupPromptDialog.vue';
import { SETUP_VISIT_STORAGE_KEY } from '@/features/privacy/privacy';

type MatchMediaResult = {
  matches: boolean;
  media: string;
  onchange: null;
  addListener: () => void;
  removeListener: () => void;
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => false;
};

const messages = {
  de: {
    components: {
      setupPrompt: {
        eyebrow: 'Setup',
        title: 'App einrichten',
        body: 'Einrichtung',
        installTitle: 'Installieren',
        installCopy: 'Install prompt',
        installIosCopy: 'Install iOS',
        installManualCopy: 'Install manual',
        installAction: 'Installieren',
        notificationTitle: 'Benachrichtigungen',
        notificationCopy: 'Benachrichtigungen erlauben',
        notificationGranted: 'Bereits erlaubt',
        notificationRetry: 'Erneut fragen',
        notificationAction: 'Erlauben',
        later: 'später',
      },
    },
  },
};

const createMatchMedia = (standalone: boolean): ((query: string) => MatchMediaResult) => (query: string) => ({
  matches: standalone && query === '(display-mode: standalone)',
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

const mountDialog = (): VueWrapper => mount(SetupPromptDialog, {
  global: {
    plugins: [createI18n({ legacy: false, locale: 'de', messages })],
  },
});

describe('SetupPromptDialog', () => {
  beforeEach(() => {
    localStorage.clear();

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: createMatchMedia(false),
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn(async () => 'default'),
      },
    });
    Object.defineProperty(window.navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn(async () => ({ state: 'prompt', onchange: null })),
      },
    });
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not show setup dialog while running standalone', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');
    window.matchMedia = createMatchMedia(true);

    const wrapper = mountDialog();
    await flushPromises();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('shows setup dialog on browser reload context', async () => {
    localStorage.setItem(SETUP_VISIT_STORAGE_KEY, 'true');
    window.matchMedia = createMatchMedia(false);

    const wrapper = mountDialog();
    await flushPromises();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('App einrichten');
    expect(wrapper.text()).toContain('später');
  });
});
