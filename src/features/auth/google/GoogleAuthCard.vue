<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Widget from '@/components/Widget.vue';
import ActionButton from '@/components/ActionButton.vue';
import Message from '@/components/Message.vue';
import { hasCachedCalendarEvents } from '@/lib/calendar-events-cache';
import { useCalendarSourceStore } from '@/features/calendar/calendar-source-store';
import { useGoogleAuthStore } from './store';

type AuthCardMode = 'login' | 'status';

const props = withDefaults(defineProps<{ mode?: AuthCardMode }>(), {
  mode: 'login',
});

const { t } = useI18n();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const calendarSourceStore = useCalendarSourceStore();
const isLoginMode = computed(() => props.mode === 'login');
const hasCachedEvents = computed(() => hasCachedCalendarEvents());
const icalUrlInput = ref(calendarSourceStore.normalizedIcalUrl);
const icalErrorMessage = ref('');
const exampleIcalUrl = computed(() => t('auth.google.ical.exampleUrl'));
const statusLabel = computed(() => {
  if (calendarSourceStore.mode === 'ical' && calendarSourceStore.isIcalConfigured) {
    return t('auth.google.status.icalActive');
  }

  if (!googleAuthStore.isConfigured) {
    return t('auth.google.status.notConfigured');
  }

  if (googleAuthStore.isAuthenticated) {
    return t('auth.google.status.active');
  }

  switch (googleAuthStore.status) {
    case 'loading':
      return t('auth.google.status.loading');
    case 'error':
      return t('auth.google.status.error');
    default:
      return t('auth.google.status.ready');
  }
});

const title = computed(() =>
  isLoginMode.value ? t('auth.google.title.login') : t('auth.google.title.status'));
const description = computed(() =>
  isLoginMode.value ? t('auth.google.description.login') : t('auth.google.description.status'));
const loginLabel = computed(() =>
  googleAuthStore.status === 'loading'
    ? t('auth.google.action.opening')
    : t('auth.google.action.connect'));
const currentCalendarSourceLabel = computed(() => {
  if (calendarSourceStore.mode === 'ical' && calendarSourceStore.isIcalConfigured) {
    return t('auth.google.message.icalActive');
  }

  if (googleAuthStore.isAuthenticated) {
    return t('auth.google.message.accessActive');
  }

  return t('auth.google.message.googleInactive');
});
const loadCachedEvents = (): void => {
  void router.push({ name: 'dashboard', query: { cachedEvents: '1' } });
};
const saveIcalSource = (): void => {
  const normalizedUrl = icalUrlInput.value.trim();

  if (!normalizedUrl) {
    icalErrorMessage.value = t('auth.google.error.icalUrlMissing');
    return;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid-protocol');
    }

    calendarSourceStore.setIcalSource(parsedUrl.toString());
    icalUrlInput.value = parsedUrl.toString();
    icalErrorMessage.value = '';
    void router.push({ name: 'dashboard' });
  } catch {
    icalErrorMessage.value = t('auth.google.error.icalUrlInvalid');
  }
};
const clearIcalSource = (): void => {
  calendarSourceStore.clearIcalSource();
  icalUrlInput.value = '';
  icalErrorMessage.value = '';
};
const activateGoogleSource = (): void => {
  calendarSourceStore.setGoogleMode();
};
const useExampleIcalUrl = (): void => {
  icalUrlInput.value = exampleIcalUrl.value;
  icalErrorMessage.value = '';
};
</script>

<template>
  <Widget class="google-auth-card" :show-actions="false" :compact="true" title-tag="h2">
    <template #sub-title>{{ statusLabel }}</template>
    <template #title>{{ title }}</template>
    <template #description>{{ description }}</template>

    <div class="auth-layout">
      <Message v-if="!googleAuthStore.isConfigured" variant="warning">
        {{ t('auth.google.message.missingClientId') }}
      </Message>

      <template v-else-if="isLoginMode">
        <div class="auth-actions">
          <ActionButton class="button-primary" :disabled="googleAuthStore.status === 'loading'"
            @click="activateGoogleSource(); googleAuthStore.signIn()">
            <template #label>{{ loginLabel }}</template>
          </ActionButton>
          <ActionButton v-if="hasCachedEvents" class="button-secondary" @click="loadCachedEvents">
            <template #label>{{ t('auth.google.action.loadCachedEvents') }}</template>
          </ActionButton>
        </div>

        <p class="scope-copy">
          {{ t('auth.google.message.scope') }}
        </p>
        <p class="helper-copy">
          {{ t('auth.google.message.cookieHint') }}
        </p>
      </template>

      <template v-else>
        <Message
          v-if="googleAuthStore.isAuthenticated || (calendarSourceStore.mode === 'ical' && calendarSourceStore.isIcalConfigured)"
          variant="success">
          {{ currentCalendarSourceLabel }}
        </Message>

        <div class="auth-actions">
          <ActionButton v-if="googleAuthStore.isAuthenticated" class="button-secondary"
            @click="googleAuthStore.signOut">
            <template #label>{{ t('auth.google.action.logout') }}</template>
          </ActionButton>
          <ActionButton v-if="calendarSourceStore.isIcalConfigured" class="button-secondary" @click="clearIcalSource">
            <template #label>{{ t('auth.google.action.removeIcal') }}</template>
          </ActionButton>
        </div>
      </template>

      <div class="ical-layout">
        <strong>{{ t('auth.google.ical.title') }}</strong>
        <p class="scope-copy">
          {{ t('auth.google.ical.description') }}
        </p>
        <label class="ical-field">
          <span>{{ t('auth.google.ical.inputLabel') }}</span>
          <input v-model.trim="icalUrlInput" class="ical-input" type="url"
            :placeholder="t('auth.google.ical.placeholder')" @keydown.enter.prevent="saveIcalSource">
        </label>
        <button type="button" class="text-action" @click="useExampleIcalUrl">
          {{ t('auth.google.ical.useExample') }}
        </button>
        <div class="auth-actions">
          <ActionButton class="button-secondary" @click="saveIcalSource">
            <template #label>{{ t('auth.google.action.useIcal') }}</template>
          </ActionButton>
        </div>
        <Message v-if="calendarSourceStore.isIcalConfigured" variant="success">
          {{ t('auth.google.ical.activeUrl', { value: calendarSourceStore.normalizedIcalUrl }) }}
        </Message>
        <Message v-if="icalErrorMessage" variant="error">
          {{ icalErrorMessage }}
        </Message>
      </div>

      <Message v-if="googleAuthStore.errorMessage" variant="error">
        {{ googleAuthStore.errorMessage }}
      </Message>
    </div>
  </Widget>
</template>

<style scoped>
.google-auth-card {
  margin-top: 20px;
}

.auth-layout {
  display: grid;
  gap: 16px;
}

.auth-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.scope-copy {
  margin: 0;
  color: rgba(226, 232, 240, 0.72);
}

.helper-copy {
  margin: -4px 0 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.62);
}

.ical-layout {
  display: grid;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.ical-field {
  display: grid;
  gap: 6px;
}

.ical-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.3);
}

.text-action {
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: #93c5fd;
  font: inherit;
  font-size: 0.92rem;
  text-decoration: underline;
  text-underline-offset: 0.16em;
  cursor: pointer;
}
</style>
