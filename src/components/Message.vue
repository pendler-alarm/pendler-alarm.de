<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'warning' | 'success' | 'error';
}>(), {
  variant: 'warning',
});
</script>

<template>
  <p class="message" :class="`message--${variant}`">
    <slot />
  </p>
</template>

<style scoped>
.message {
  margin: 0;
  padding: 14px 16px;
  border-radius: 18px;
  line-height: 1.5;
}

.message--warning {
  color: var(--message-warning-text);
  background: var(--message-warning-bg);
  border: 1px solid var(--message-warning-border);
}

.message--success {
  color: var(--message-success-text);
  background: var(--message-success-bg);
  border: 1px solid var(--message-success-border);
}

.message--error {
  color: var(--message-error-text);
  background: var(--message-error-bg);
  border: 1px solid var(--message-error-border);
}
</style>
