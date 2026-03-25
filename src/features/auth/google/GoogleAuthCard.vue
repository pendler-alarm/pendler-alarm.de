<script setup lang="ts">
import { computed } from 'vue';
import Widget from '@/components/Widget.vue';
import ActionButton from '@/components/ActionButton.vue';
import { useGoogleAuthStore } from './store';

type AuthCardMode = 'login' | 'status';

const props = withDefaults(defineProps<{ mode?: AuthCardMode }>(), {
  mode: 'login',
});

const googleAuthStore = useGoogleAuthStore();
const isLoginMode = computed(() => props.mode === 'login');
const statusLabel = computed(() => {
  if (!googleAuthStore.isConfigured) {
    return 'Nicht konfiguriert';
  }

  if (googleAuthStore.isAuthenticated) {
    return 'Calendar Zugriff aktiv';
  }

  switch (googleAuthStore.status) {
    case 'loading':
      return 'Google OAuth lauft';
    case 'error':
      return 'Fehler';
    default:
      return 'Bereit';
  }
});

const title = computed(() => (isLoginMode.value ? 'Google Calendar Login' : 'Google Calendar Status'));
const description = computed(() =>
  isLoginMode.value
    ? 'Melde dich mit Google an und gib der App Zugriff auf deinen Kalender.'
    : 'Der Zugriff auf deinen Google Kalender ist fur das Dashboard aktiv.',
);
const loginLabel = computed(() =>
  googleAuthStore.status === 'loading' ? 'Google OAuth wird geoffnet' : 'Mit Google Calendar verbinden',
);
</script>

<template>
  <Widget class="google-auth-card" :show-actions="false" :compact="true" title-tag="h2">
    <template #sub-title>{{ statusLabel }}</template>
    <template #title>{{ title }}</template>
    <template #description>{{ description }}</template>

    <div class="auth-layout">
      <p v-if="!googleAuthStore.isConfigured" class="auth-message auth-message--warning">
        Trage `VITE_GOOGLE_CLIENT_ID` in der `.env` ein, damit der Login verfugbar ist.
      </p>

      <template v-else-if="isLoginMode">
        <div class="auth-actions">
          <ActionButton
            class="button-primary"
            :disabled="googleAuthStore.status === 'loading'"
            @click="googleAuthStore.signIn"
          >
            <template #label>{{ loginLabel }}</template>
          </ActionButton>
        </div>

        <p class="scope-copy">
          Scope: `https://www.googleapis.com/auth/calendar`
        </p>
      </template>

      <template v-else>
        <p class="auth-message auth-message--success" v-if="googleAuthStore.isAuthenticated">
          Der OAuth-Zugriff fur Google Calendar ist aktiv.
        </p>

        <div class="auth-actions">
          <ActionButton class="button-secondary" @click="googleAuthStore.signOut">
            <template #label>Abmelden</template>
          </ActionButton>
        </div>
      </template>

      <p v-if="googleAuthStore.errorMessage" class="auth-message auth-message--error">
        {{ googleAuthStore.errorMessage }}
      </p>
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

.auth-message {
  margin: 0;
  padding: 14px 16px;
  border-radius: 18px;
  line-height: 1.5;
}

.auth-message--warning {
  color: #fef3c7;
  background: rgba(120, 53, 15, 0.45);
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.auth-message--success {
  color: #d1fae5;
  background: rgba(6, 95, 70, 0.45);
  border: 1px solid rgba(52, 211, 153, 0.28);
}

.auth-message--error {
  color: #fee2e2;
  background: rgba(127, 29, 29, 0.55);
  border: 1px solid rgba(248, 113, 113, 0.35);
}
</style>
