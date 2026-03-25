<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Widget from '@/components/Widget.vue';
import { fetchReleaseMeta, getDefaultReleaseMeta, type ReleaseSection } from '@/lib/release-meta';

const defaultMeta = getDefaultReleaseMeta();
console.log('defaultMeta: ', defaultMeta);
const isLoading = ref(defaultMeta.releaseSections.length === 0);
const hasLoadError = ref(false);
const sections = ref<ReleaseSection[]>(defaultMeta.releaseSections);

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
      <template #sub-title>Builds und Changes</template>
      <template #title>Release History</template>
      <template #description>
        Hier siehst du die veroffentlichten Versionen und die enthaltenen Anderungen.
      </template>
    </Widget>

    <Widget v-if="isLoading" class="release-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>Status</template>
      <template #title>Release-Historie wird vorbereitet</template>
      <p class="state-copy">
        Die Daten werden beim Start oder Build generiert und stehen gleich hier bereit.
      </p>
    </Widget>

    <Widget v-else-if="hasLoadError" class="release-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>Status</template>
      <template #title>Release-Historie aktuell nicht verfugbar</template>
      <p class="state-copy">
        Es konnten keine Release-Daten geladen werden. Beim nachsten Start oder Build werden sie neu erzeugt.
      </p>
    </Widget>

    <Widget v-else-if="sections.length === 0" class="release-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>Status</template>
      <template #title>Noch keine Releases vorhanden</template>
      <p class="state-copy">
        Sobald Git-Tags vorhanden sind, erscheinen die Versionen automatisch in dieser Ansicht.
      </p>
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
