<template>
    <template v-if="props.segment">
        <ProductIcon class="connection-route-line-product" :segment="props.segment" />
        <Item :label="label" :label-style="{ bold: true }" />
        <Item v-if="props.segment?.toStop" label="directionLabel" :value="props.segment.toStop" type="connection" />
    </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Item from '@/components/Item/Item.vue';
import ProductIcon from '@/components/ProductIcon/ProductIcon.vue';
import type { ConnectionSegment } from '@/features/motis/routing-service';
import { formatConnectionServiceLabel } from '../connection/connection-utils';

const props = defineProps<{
    segment: ConnectionSegment | null;
}>();

const label = computed(() => (
    props.segment ? formatConnectionServiceLabel(props.segment) : ''
));
</script>
