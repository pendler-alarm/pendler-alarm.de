<template>
    <div v-if="shouldRender" class="conneXXction-route-address-row">
        <span v-if="resolvedLabel" :class="[resolvedLabelStyle]">{{ resolvedLabel }}</span>{{ resolvedSeparator }}
        <span v-if="resolvedValue" class="connection-rouXXte-detail-value">{{ resolvedValue }}</span>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import './Item.css';
import type { ItemProps, StyledItemProps } from './Item.d';
import { checkVisibility, getLabel } from '../_shared/utils/utils';

export default defineComponent({
    name: 'Item',
    props: {
        show: { type: Boolean, default: true },
        label: { type: String, default: null },
        labelStyle: { type: Object as PropType<StyledItemProps>, default: null },
        value: { type: String as PropType<string | null>, default: null },
        seperator: { type: String, default: ' ' },
        type: { type: String, default: 'default' },
    },
    setup(props: ItemProps) {
        const shouldRender = computed(() => checkVisibility(props, ['label', 'value']));
        const resolvedType = props.type || 'default';
        const resolvedLabel = computed(() => getLabel(resolvedType, props.label || ''));
        const resolvedLabelStyle = computed(() => {
            const styles = props.labelStyle || {};
            let css = '';
            if (styles.bold) {
                css += 'fw-bold';
            }
            if (styles.italic) {
                css += 'fst-italic';
            }
            if (styles.underline) {
                css += 'text-decoration-underline';
            }
            return css;
        });

        return {
            shouldRender,
            resolvedLabel,
            resolvedValue: props.value,
            resolvedSeparator: props.seperator,
            resolvedLabelStyle,
        };
    },
});
</script>
