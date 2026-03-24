<script setup lang="ts">
import { RouterView } from 'vue-router'
import versionStore from '@/stores/version'

const version = versionStore.state.version
</script>

<template>
  <div id="app">
    <main>
      <RouterView />
    </main>

    <div id="footer">
      <div class="container text-left">
        <p class="text-muted credit" style="color: #fff">Version: {{ version }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'App',
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  font-family: 'Dosis', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--fg-light);
}
</style>
