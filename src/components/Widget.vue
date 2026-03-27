<template>
  <section class="widget" :class="{ 'widget--compact': compact }">
    <div class="widget-content">
      <p v-if="hasSubtitle" class="eyebrow">
        <slot name="sub-title"></slot>
      </p>
      <component :is="titleTag" class="widget-title">
        <SvgIcon v-if="iconName" :icon="iconName" class="headline-icon" />
        <slot name="title"></slot>
      </component>
      <p v-if="hasDescription" class="intro">
        <slot name="description"></slot>
      </p>
      <div v-if="hasBody" class="widget-body">
        <slot></slot>
      </div>
    </div>
    <div v-if="showActions" class="widget-actions">
      <slot name="actions">
        <ActionButton>
          <template #label>
            API
          </template>
        </ActionButton>
      </slot>
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
    compact: {
      type: Boolean,
      default: false,
    },
    isAuthorized: {
      type: Boolean,
      default: false,
    },
    showActions: {
      type: Boolean,
      default: true,
    },
    titleTag: {
      type: String,
      default: 'h1',
    },
  },
  computed: {
    hasBody() {
      return Boolean(this.$slots.default?.().length);
    },
    hasDescription() {
      return Boolean(this.$slots.description?.().length);
    },
    hasSubtitle() {
      return Boolean(this.$slots['sub-title']?.().length);
    },
    iconName() {
      const slot = this.$slots.icon?.() ?? [];
      const content = slot
        .map((node) => typeof node.children === 'string' ? node.children : '')
        .join('');

      return content.trim();
    },
  },
};
</script>

<style scoped>
.widget {
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

.widget-content {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 12px;
  color: #93c5fd;
}

.widget-title,
.intro {
  margin: 0;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: clamp(2rem, 3vw, 3.6rem);
  line-height: 1;
}

.widget--compact {
  display: block;
  padding: 16px 18px;
  border-radius: 14px;
  box-shadow: none;
}

.widget--compact .widget-title {
  font-size: 1.35rem;
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

.widget-body {
  margin-top: 16px;
}

.widget-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .widget {
    padding: 18px;
    border-radius: 22px;
    display: grid;
  }

  .widget--compact {
    padding: 16px;
    border-radius: 18px;
  }
}
</style>
