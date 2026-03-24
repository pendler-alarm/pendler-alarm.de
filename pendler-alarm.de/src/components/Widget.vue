<template>
  <section class="hero-card">
    <div>
      <p class="eyebrow">
        <slot name="sub-title"></slot>
      </p>
      <h1>
        <SvgIcon v-if="iconName" :icon="iconName" class="headline-icon" />
        <slot name="title"></slot>
      </h1>
      <p class="intro">
        <slot name="description"></slot>
      </p>
    </div>
    <div class="hero-actions">
      <ActionButton>
        <template #label>
          API
        </template>
      </ActionButton>
    </div>
  </section>
</template>

<script lang="ts">
import ActionButton from './ActionButton.vue';
import SvgIcon from './SvgIcon.vue';

export default {
  name: 'Widget',
  components: {
    ActionButton,
    SvgIcon,
  },
  props: {
    isAuthorized: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    iconName() {
      const slot = this.$slots.icon?.();
      const firstNode = slot?.[0];
      const content = typeof firstNode?.children === 'string' ? firstNode.children : '';

      return content.trim();
    },
  },
};
</script>

<style scoped>
.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border-radius: 28px;
  border: 1px solid rgba(241, 245, 249, 0.18);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.72));
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 12px;
  color: #93c5fd;
}

h1,
p {
  margin: 0;
}

h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: clamp(2rem, 3vw, 3.6rem);
  line-height: 1;
}

.headline-icon {
  flex: 0 0 auto;
}

.intro {
  margin-top: 16px;
  max-width: 780px;
  color: rgba(226, 232, 240, 0.88);
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .hero-card {
    padding: 18px;
    border-radius: 22px;
    display: grid;
  }
}
</style>
