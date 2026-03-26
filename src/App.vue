<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';
import { setLocale, type AppLocale } from '@/i18n';
import { fetchReleaseMeta, getDefaultReleaseMeta } from '@/lib/release-meta';

const { t, locale } = useI18n();
const version = ref(getDefaultReleaseMeta().appVersion);
const currentLocale = computed(() => locale.value as AppLocale);
const localeOptions = computed(() => [
  { code: 'de' as const, label: t('app.locale.de') },
  { code: 'en' as const, label: t('app.locale.en') },
]);

const switchLocale = (nextLocale: AppLocale): void => {
  setLocale(nextLocale);
};

onMounted(async () => {
  try {
    const meta = await fetchReleaseMeta();
    version.value = meta.appVersion;
  } catch {
    version.value = getDefaultReleaseMeta().appVersion;
  }
});
</script>

<template>
  <div id="app">
    <main>
      <RouterView />
    </main>

    <div id="footer">
      <div class="footer-bar">
        <p class="text-muted credit" style="color: #fff">
          {{ t('app.footer.version') }}:
          <RouterLink class="release-link" to="/releases">
            {{ version }}
          </RouterLink>
        </p>

        <div class="locale-switcher" :aria-label="t('app.footer.language')">
          <span class="locale-label">{{ t('app.footer.language') }}</span>
          <button
            v-for="localeOption in localeOptions"
            :key="localeOption.code"
            type="button"
            class="locale-button"
            :class="{ 'locale-button--active': currentLocale === localeOption.code }"
            @click="switchLocale(localeOption.code)"
          >
            {{ localeOption.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  font-family: 'Dosis', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--fg-light);
}

.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px 24px;
}

.release-link {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.locale-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.locale-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
}

.locale-button {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.locale-button--active {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.45);
}

@media (max-width: 720px) {
  .footer-bar {
    padding: 0 14px 20px;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
