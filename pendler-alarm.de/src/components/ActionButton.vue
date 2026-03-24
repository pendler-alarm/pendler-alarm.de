<template>
  <button type="button" class="button-chip">
    <slot name="label"></slot>
  </button>
</template>

<style scoped>
button {
  border: 0;
  border-radius: 16px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.16s ease, opacity 0.16s ease, background 0.16s ease;
}

.button-primary {
  background: linear-gradient(135deg, #38bdf8, #2563eb);
  color: #eff6ff;
}

.button-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.button-chip {
  background: rgba(14, 165, 233, 0.12);
  color: #bae6fd;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
