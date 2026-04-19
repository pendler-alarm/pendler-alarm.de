<template>
  <span v-if="svgMarkup" class="svg-icon" aria-hidden="true" v-html="svgMarkup"></span>
  <span v-else-if="fallbackText" class="svg-icon svg-icon--fallback" :style="fallbackStyle" aria-hidden="true">
    {{ fallbackText }}
  </span>
</template>

<script lang="ts" src="./SvgIcon.ts"></script>

<style scoped src="./SvgIcon.css"></style>
