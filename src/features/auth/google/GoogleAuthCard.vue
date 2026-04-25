<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Widget from '@/components/Widget.vue';
import ActionButton from '@/components/ActionButton.vue';
import Message from '@/components/Message.vue';
import { hasCachedCalendarEvents } from '@/lib/calendar-events-cache';
import { useGoogleAuthStore } from './store';

type AuthCardMode = 'login' | 'status';

const props = withDefaults(defineProps<{ mode?: AuthCardMode }>(), {
  mode: 'login',
});

const { t } = useI18n();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const isLoginMode = computed(() => props.mode === 'login');
const hasCachedEvents = computed(() => hasCachedCalendarEvents());
const statusLabel = computed(() => {
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
const loadCachedEvents = (): void => {
  void router.push({ name: 'dashboard', query: { cachedEvents: '1' } });
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
            @click="googleAuthStore.signIn">
            <template #label>{{ loginLabel }}</template>
          </ActionButton>
          <ActionButton v-if="hasCachedEvents" class="button-secondary" @click="loadCachedEvents">
            <template #label>{{ t('auth.google.action.loadCachedEvents') }}</template>
          </ActionButton>
        </div>

        <p class="scope-copy">
          {{ t('auth.google.message.scope') }}
        </p>
      </template>

      <template v-else>
        <Message v-if="googleAuthStore.isAuthenticated" variant="success">
          {{ t('auth.google.message.accessActive') }}
        </Message>

        <div class="auth-actions">
          <ActionButton class="button-secondary" @click="googleAuthStore.signOut">
            <template #label>{{ t('auth.google.action.logout') }}</template>
          </ActionButton>
        </div>
      </template>

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
</style>
