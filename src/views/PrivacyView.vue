<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import {
  getPrivacyApiUsageEntries,
  getPrivacyStorageEntries,
  type PrivacyApiUsageEntry,
  type PrivacyStorageStateEntry,
} from '@/features/privacy/privacy';
import { getApiMetrics } from '@/lib/api-metrics';

const { t } = useI18n();
const apiEntries = computed(() => getPrivacyApiUsageEntries(getApiMetrics()));
const storageEntries = computed(() => getPrivacyStorageEntries());

const getApiTitle = (entry: PrivacyApiUsageEntry): string =>
  entry.titleKey ? t(entry.titleKey) : (entry.titleText ?? entry.url);

const getApiDescription = (entry: PrivacyApiUsageEntry): string =>
  t(entry.descriptionKey);

const getApiProvider = (entry: PrivacyApiUsageEntry): string =>
  entry.providerKey ? t(entry.providerKey) : (entry.providerText ?? entry.url);

const getStorageTitle = (entry: PrivacyStorageStateEntry): string =>
  t(entry.titleKey);
</script>

<template>
  <section class="privacy-view">
    <header class="privacy-hero">
      <p class="privacy-kicker">{{ t('views.privacy.kicker') }}</p>
      <h1>{{ t('views.privacy.title') }}</h1>
      <p class="privacy-lead">{{ t('views.privacy.lead') }}</p>
    </header>

    <article class="privacy-card">
      <h2>{{ t('views.privacy.introTitle') }}</h2>
      <p>{{ t('views.privacy.introBodyOne') }}</p>
      <p>{{ t('views.privacy.introBodyTwo') }}</p>
    </article>

    <article class="privacy-card">
      <h2>{{ t('views.privacy.externalApisTitle') }}</h2>
      <p>{{ t('views.privacy.externalApisBody') }}</p>
      <ul class="privacy-list">
        <li v-for="entry in apiEntries" :key="entry.key" class="privacy-item">
          <div class="privacy-item__header">
            <div class="privacy-item__title">
              <SvgIcon v-if="entry.icon" :icon="entry.icon" class="privacy-item__icon" :dimension="18" />
              <strong>{{ getApiTitle(entry) }}</strong>
            </div>
            <span class="privacy-badge" :class="{ 'privacy-badge--active': entry.isObserved }">
              {{
                entry.isObserved
                  ? t('views.privacy.apiStatusUsed', { count: entry.requestCount })
                  : t('views.privacy.apiStatusUnused')
              }}
            </span>
          </div>
          <p>{{ getApiDescription(entry) }}</p>
          <p>{{ t('views.privacy.apiProvider', { value: getApiProvider(entry) }) }}</p>
          <p>{{ t('views.privacy.apiUrl', { value: entry.url }) }}</p>
          <p v-if="entry.lastUsedIso">{{ t('views.privacy.apiLastUsed', { value: entry.lastUsedIso }) }}</p>
        </li>
      </ul>
    </article>

    <article class="privacy-card">
      <h2>{{ t('views.privacy.browserStorageTitle') }}</h2>
      <p>{{ t('views.privacy.browserStorageBody') }}</p>
      <ul class="privacy-list">
        <li v-for="entry in storageEntries" :key="entry.key" class="privacy-item">
          <div class="privacy-item__header">
            <strong>{{ getStorageTitle(entry) }}</strong>
            <span class="privacy-badge" :class="{ 'privacy-badge--active': entry.isPresent }">
              {{
                entry.isPresent
                  ? t('views.privacy.storageStatusPresent')
                  : t('views.privacy.storageStatusMissing')
              }}
            </span>
          </div>
          <p>{{ t(entry.descriptionKey) }}</p>
          <p>{{ t('views.privacy.storageType', { value: entry.storage }) }}</p>
          <p>{{ t('views.privacy.storageKey', { value: entry.storageKey }) }}</p>
        </li>
      </ul>
    </article>

    <article class="privacy-card">
      <h2>{{ t('views.privacy.contactTitle') }}</h2>
      <p>{{ t('views.privacy.contactBody') }}</p>
    </article>
  </section>
</template>

<style scoped>
.privacy-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  display: grid;
  gap: 24px;
}

.privacy-hero,
.privacy-card {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
}

.privacy-kicker {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.privacy-hero h1,
.privacy-card h2 {
  margin: 0 0 12px;
  color: #172033;
}

.privacy-lead,
.privacy-card p {
  margin: 0;
  color: rgba(23, 32, 51, 0.82);
  line-height: 1.6;
}

.privacy-card p {
  overflow-wrap: anywhere;
}

.privacy-card {
  display: grid;
  gap: 12px;
}

.privacy-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.privacy-item {
  min-width: 0;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.05);
  display: grid;
  gap: 8px;
}

.privacy-item__header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.privacy-item__title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.privacy-item__title strong {
  overflow-wrap: anywhere;
}

.privacy-item__icon {
  color: #0f766e;
  flex: 0 0 auto;
}

.privacy-badge {
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(148, 163, 184, 0.2);
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
}

.privacy-badge--active {
  background: rgba(34, 197, 94, 0.16);
  color: #166534;
}

@media (max-width: 720px) {
  .privacy-view {
    padding: 18px 14px 40px;
  }
}
</style>
