<script setup lang="ts">
import { computed } from 'vue'
import Widget from '@/components/Widget.vue'

type ReleaseSection = {
  version: string
  date: string
  changes: string[]
}

import releaseHistoryRaw from '../generated/RELEASE_HISTORY.md?raw'

const sections = computed<ReleaseSection[]>(() => {
  const lines = releaseHistoryRaw.split('\n').map((line) => line.trim())
  const parsed: ReleaseSection[] = []

  let current: ReleaseSection | null = null

  for (const line of lines) {
    if (line.startsWith('## v')) {
      if (current) {
        parsed.push(current)
      }

      const header = line.replace('## ', '')
      const [rawVersion, date = ''] = header.split(' - ')
      const version = rawVersion ?? 'v0.0.0'

      current = {
        version,
        date,
        changes: [],
      }

      continue
    }

    if (line.startsWith('- ') && current) {
      current.changes.push(line.slice(2))
    }
  }

  if (current) {
    parsed.push(current)
  }

  return parsed
})
</script>

<template>
  <section class="release-view">
    <Widget>
      <template #icon>logo</template>
      <template #sub-title>Builds und Changes</template>
      <template #title>Release History</template>
      <template #description>
        Hier siehst du die veroffentlichten Versionen und die enthaltenen Anderungen.
      </template>
    </Widget>

    <p v-if="sections.length === 0" class="empty-state">
      Noch keine Releases vorhanden.
    </p>

    <Widget
      v-for="section in sections"
      :key="`${section.version}-${section.date}`"
      class="release-card"
      :show-actions="false"
      :compact="true"
      title-tag="h2"
    >
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

.empty-state,
.release-card {
  margin-top: 20px;
}

.release-list {
  margin: 0;
  padding-left: 20px;
}

.empty-state {
  opacity: 0.75;
}

@media (max-width: 720px) {
  .release-view {
    padding: 18px 14px 40px;
  }
}
</style>
