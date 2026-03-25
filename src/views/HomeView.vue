<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import Widget from '@/components/Widget.vue';
import GoogleAuthCard from '@/features/auth/google/GoogleAuthCard.vue';
import { useGoogleAuthStore } from '@/features/auth/google/store';

const router = useRouter();
const googleAuthStore = useGoogleAuthStore();

watch(
  () => googleAuthStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      router.replace({ name: 'dashboard' });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="home">
    <Widget>
      <template #icon>logo</template>
      <template #title>pendler-alarm.de</template>
      <template #description>Dein Kalender zwischen Gleis und Alltag.</template>
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
