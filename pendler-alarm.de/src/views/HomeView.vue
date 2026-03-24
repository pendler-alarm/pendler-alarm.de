<script setup lang="ts">
import Widget from '@/components/Widget.vue';
</script>

<template>
  <div class="home">
    <Widget>
      <template #icon>logo</template>
      <template #title>pendler-alarm.de</template>
      <template #description>Dein Kalender zwischen Gleis und Alltag.</template>
    </Widget>
  </div>
</template>
<style scoped>
.home {
  max-width: 1360px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.dashboard-grid,
.results-grid {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.dashboard-grid {
  grid-template-columns: 1.05fr 0.95fr;
}

.results-grid {
  grid-template-columns: 1.15fr 0.85fr;
}

.error {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  color: #fee2e2;
  background: rgba(127, 29, 29, 0.6);
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.status-message {
  margin-top: 16px;
  padding: 18px;
  border-radius: 18px;
  color: rgba(226, 232, 240, 0.72);
  background: rgba(255, 255, 255, 0.04);
}

@media (max-width: 1100px) {

  .dashboard-grid,
  .results-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .home {
    padding: 18px 14px 40px;
  }
}
</style>
