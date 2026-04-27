<template>
    <div :data-item-type="resolvedType" v-if="shouldRender && !isLink" :class="resolvedCss">
        <span data-type="emoji" v-if="emoji">{{ emoji }}</span>{{ seperator }}
        <span data-type="label" v-if="resolvedLabel" :class="[resolvedLabelStyle]">{{ resolvedLabel }}</span>{{
            seperator }}
        <span data-type="text" v-if="resolvedValue">{{ resolvedValue }}</span>
    </div>
    <a :data-item-type="resolvedType" v-if="link && isLink" :href="link.href" target="_blank" rel="noopener noreferrer">
        <span data-type="emoji" v-if="emoji">{{ emoji }}</span>{{ seperator }}
        <span data-type="label" v-if="resolvedLabel" :class="[resolvedLabelStyle]">{{ resolvedLabel }}</span>{{
            seperator }}
        <span data-type="text" v-if="resolvedValue">{{ resolvedValue }}</span>
    </a>
</template>
<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import './Item.css';
import type { ItemProps, LINK, StyledItemProps } from './Item.d';
import { checkVisibility, getLabelByType, getStyles, getType, getValue, isLinkText, isVisibleLink } from '../_shared/utils/utils';
import { STYLES_CONFIG } from './Item.config';

export default defineComponent({
    name: 'Item',
    props: {
        inline: { type: Boolean, default: false },
        bold: { type: Boolean, default: false },
        emoji: { type: String, default: null },
        show: { type: Boolean, default: true },
        label: { type: String, default: null },
        css: { type: String, default: null },
        labelStyle: { type: Object as PropType<StyledItemProps>, default: null },
        labelProps: { type: Object as PropType<Record<string, unknown>>, default: null },
        value: { type: String as PropType<string | null>, default: null },
        text: { type: String as PropType<string | null>, default: null },
        link: { type: Object as PropType<LINK | null>, default: null },
        seperator: { type: String, default: ' ' },
        type: { type: String, default: null },
    },
    setup(props: ItemProps) {
        return {
            resolvedCss: computed(() => [props.css, props.inline ? 'item--inline' : null, props.bold ? 'item--bold' : null].filter(Boolean).join(' ')),
            isLink: computed(() => isVisibleLink(props.link as LINK)),
            shouldRender: computed(() => checkVisibility(props, ['label', 'value', 'link', 'emoji'])),
            resolvedLabel: computed(() => getLabelByType(props)),
            resolvedValue: computed(() => getValue(props, ['text', 'value', ...isLinkText(props)])),
            resolvedType: computed(() => getType(props)),
            resolvedLabelStyle: computed(() => getStyles(props, STYLES_CONFIG)),
        };
    },
});
</script>
