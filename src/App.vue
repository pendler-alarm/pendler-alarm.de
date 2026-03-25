<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { fetchReleaseMeta, getDefaultReleaseMeta } from '@/lib/release-meta';

const version = ref(getDefaultReleaseMeta().appVersion);

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
      <div class="container text-left">
        <p class="text-muted credit" style="color: #fff">
          Version:
          <RouterLink class="release-link" to="/releases">
            {{ version }}
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'App',
};
</script>

<style scoped>
#app {
  min-height: 100vh;
  font-family: 'Dosis', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--fg-light);
}

.release-link {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
</style>
