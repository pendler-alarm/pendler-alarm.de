<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import type { NextbikeAccount } from '@/features/sharing/nextbike-auth';

const props = defineProps<{
  account: NextbikeAccount | null;
  isLoading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (event: 'login', credentials: { mobile: string; pin: string }): void;
  (event: 'logout'): void;
}>();

const { t } = useI18n();
const form = reactive({
  mobile: '',
  pin: '',
});

const accountLabel = computed(() => props.account?.screenName || props.account?.mobile || null);

const submit = (): void => {
  emit('login', {
    mobile: form.mobile,
    pin: form.pin,
  });
};

const logout = (): void => {
  form.pin = '';
  emit('logout');
};
</script>

<template>
  <section class="nextbike-auth-card">
    <div class="nextbike-auth-copy">
      <strong>{{ t('views.dashboard.events.sharing.nextbike.title') }}</strong>
      <span>{{ t('views.dashboard.events.sharing.nextbike.description') }}</span>
      <span v-if="accountLabel" class="nextbike-auth-status">
        {{ t('views.dashboard.events.sharing.nextbike.connectedAs', { value: accountLabel }) }}
      </span>
      <span v-else class="nextbike-auth-status">
        {{ t('views.dashboard.events.sharing.nextbike.disconnected') }}
      </span>
      <span v-if="error" class="nextbike-auth-error">{{ error }}</span>
    </div>

    <form class="nextbike-auth-form" @submit.prevent="submit">
      <label class="sharing-field">
        <span>{{ t('views.dashboard.events.sharing.nextbike.mobileLabel') }}</span>
        <input v-model.trim="form.mobile" class="sharing-input" type="text" autocomplete="username">
      </label>
      <label class="sharing-field">
        <span>{{ t('views.dashboard.events.sharing.nextbike.pinLabel') }}</span>
        <input v-model.trim="form.pin" class="sharing-input" type="password" autocomplete="current-password">
      </label>
      <div class="nextbike-auth-actions">
        <button class="origin-chip-action" type="submit" :disabled="isLoading">
          {{ isLoading ? t('views.dashboard.events.sharing.nextbike.connecting') : t('views.dashboard.events.sharing.nextbike.connect') }}
        </button>
        <button
          v-if="account"
          class="origin-chip-action origin-chip-action--danger"
          type="button"
          :disabled="isLoading"
          @click="logout"
        >
          {{ t('views.dashboard.events.sharing.nextbike.logout') }}
        </button>
      </div>
      <p class="nextbike-auth-note">
        {{ t('views.dashboard.events.sharing.nextbike.storageHint') }}
      </p>
    </form>
  </section>
</template>

<style scoped>
.nextbike-auth-card {
  display: grid;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.78);
}

.nextbike-auth-copy,
.nextbike-auth-form,
.nextbike-auth-actions {
  display: grid;
  gap: 8px;
}

.nextbike-auth-copy span,
.nextbike-auth-note {
  font-size: 0.84rem;
  color: #4b5563;
}

.nextbike-auth-status {
  font-weight: 600;
  color: #111827;
}

.nextbike-auth-error {
  color: #b91c1c;
}

.nextbike-auth-actions {
  grid-template-columns: repeat(auto-fit, minmax(140px, max-content));
}
</style>
