<template>
    <section class="card">
        <slot v-if="hasCustomSlot" name="custom" />
    </section>
</template>
<style src="./Card.css"></style>

<script lang="ts">
import { defineComponent } from 'vue';
import { hasRenderableSlotContent } from '../_shared/utils/utils';

export default defineComponent({
    name: 'Card',
    props: {
        title: { type: String, default: null },
    },
    setup(props, { slots }) {
        const hasCustomSlot = hasRenderableSlotContent(slots.custom?.());

        return {
            hasCustomSlot,
        };
    },
});
</script>