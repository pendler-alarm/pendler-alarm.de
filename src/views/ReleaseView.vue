<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Widget from '@/components/Widget.vue';
import { fetchReleaseMeta, getDefaultReleaseMeta, type ReleaseSection } from '@/lib/release-meta';

const { t } = useI18n();
const defaultMeta = getDefaultReleaseMeta();
const isLoading = ref(defaultMeta.releaseSections.length === 0);
const hasLoadError = ref(false);
const sections = ref<ReleaseSection[]>(defaultMeta.releaseSections);

const releaseStateMessages = {
  loading: {
    title: 'views.release.states.loading.title',
    description: 'views.release.states.loading.description',
  },
  error: {
    title: 'views.release.states.error.title',
    description: 'views.release.states.error.description',
  },
  empty: {
    title: 'views.release.states.empty.title',
    description: 'views.release.states.empty.description',
  },
} as const;

type ReleaseStateKey = keyof typeof releaseStateMessages;

const releaseState = computed(() => {
  let state: ReleaseStateKey | null = null;
  if (isLoading.value) {
    state = 'loading';
  } else if (hasLoadError.value) {
    state = 'error';
  } else if (sections.value.length === 0) {
    state = 'empty';
  }

  if (state !== null) {
    const messages = releaseStateMessages[state];

    return {
      title: t(messages.title),
      description: t(messages.description),
      state,
    };
  }

  return null;
});

onMounted(async () => {
  try {
    const meta = await fetchReleaseMeta();
    sections.value = meta.releaseSections;
    hasLoadError.value = false;
  } catch {
    sections.value = defaultMeta.releaseSections;
    hasLoadError.value = true;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <section class="release-view">
    <Widget>
      <template #sub-title>{{ t('views.release.hero.subTitle') }}</template>
      <template #title>{{ t('views.release.hero.title') }}</template>
      <template #description>{{ t('views.release.hero.description') }}</template>
    </Widget>

    <Widget v-if="releaseState" class="release-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>{{ t('views.release.states.status') }}</template>
      <template #title>{{ releaseState.title }}</template>
      <p class="state-copy">{{ releaseState.description }}</p>
    </Widget>

    <Widget v-for="section in sections" :key="`${section.version}-${section.date}`" class="release-card"
      :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>{{ section.date }}</template>
      <template #title>{{ section.version }}</template>

      <ul class="release-list">
        <li v-for="change in section.changes" :key="change">{{ change }}</li>
      </ul>
    </Widget>
  </section>
</template>

<style scoped>
.release-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.release-card {
  margin-top: 20px;
}

.release-list {
  margin: 0;
  padding-left: 20px;
}

.state-copy {
  margin: 0;
  opacity: 0.75;
}

@media (max-width: 720px) {
  .release-view {
    padding: 18px 14px 40px;
  }
}
</style>
