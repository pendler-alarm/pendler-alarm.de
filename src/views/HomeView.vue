<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Widget from '@/components/Widget.vue';
import { useCalendarSourceStore } from '@/features/calendar/calendar-source-store';
import GoogleAuthCard from '@/features/auth/google/GoogleAuthCard.vue';
import { useGoogleAuthStore } from '@/features/auth/google/store';

const { t } = useI18n();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const calendarSourceStore = useCalendarSourceStore();

watch(
  () => `${String(googleAuthStore.isAuthenticated)}:${calendarSourceStore.mode}:${calendarSourceStore.normalizedIcalUrl}`,
  () => {
    if (googleAuthStore.isAuthenticated || calendarSourceStore.isIcalConfigured) {
      router.replace({ name: 'dashboard' });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="home">
    <Widget>
      <template #icon>{{ t('app.logo') }}</template>
      <template #title>{{ t('views.home.title') }}</template>
      <template #description>{{ t('views.home.description') }}</template>
    </Widget>

    <GoogleAuthCard mode="login" />
  </div>
</template>

<style scoped>
.home {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

@media (max-width: 720px) {
  .home {
    padding: 18px 14px 40px;
  }
}
</style>
