<template>
  <span
    class="emoji"
    :style="emojiStyle"
    :role="props.decorative ? undefined : 'img'"
    :aria-hidden="props.decorative ? 'true' : undefined"
    :aria-label="props.decorative ? undefined : accessibleLabel"
  >
    {{ props.emoji }}
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import './Emoji.css';
import { getEmojiStyle } from './Emoji.ts';
import type { EmojiProps } from './Emoji.d';

export default defineComponent({
  name: 'Emoji',
  props: {
    emoji: { type: String, required: true },
    decorative: { type: Boolean, default: true },
    label: { type: String, default: '' },
    dimension: { type: [Number, String], default: null },
    width: { type: [Number, String], default: null },
    height: { type: [Number, String], default: null },
    fontSize: { type: [Number, String], default: null },
  },
  setup(props: EmojiProps) {
    const accessibleLabel = computed(() => props.label || props.emoji);
    const emojiStyle = computed(() => getEmojiStyle(props));

    return {
      accessibleLabel,
      emojiStyle,
      props,
    };
  },
});
</script>
