<script setup lang="ts">
import { computed } from 'vue'

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
    <h1>Release History</h1>

    <p v-if="sections.length === 0" class="empty-state">
      Noch keine Releases vorhanden.
    </p>

    <article v-for="section in sections" :key="`${section.version}-${section.date}`" class="release-card">
      <header>
        <h2>{{ section.version }}</h2>
        <p>{{ section.date }}</p>
      </header>

      <ul>
        <li v-for="change in section.changes" :key="change">{{ change }}</li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.release-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.release-card {
  padding: 16px 18px;
  margin-top: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.release-card header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.release-card h2,
.release-card p {
  margin: 0;
}

.release-card ul {
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
