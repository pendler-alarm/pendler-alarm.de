import { defineComponent, type PropType } from 'vue';
import Chip from '@/components/Chip/Chip.vue';
import Item from '@/components/Item/Item.vue';
import type { LINK } from '@/components/Item/Item.d';
import type { ChipItemProps } from './ChipItem.d';

export default defineComponent({
  name: 'ChipItem',
  components: {
    Chip,
    Item,
  },
  props: {
    bold: { type: Boolean, default: false },
    css: { type: String, default: null },
    chipType: { type: String, default: 'default' },
    emoji: { type: String, default: null },
    label: { type: String as PropType<string | null>, default: null },
    labelProps: { type: Object, default: null },
    labelStyle: { type: Object, default: null },
    rootAttributes: { type: Object, default: null },
    rootClassName: { type: [String, Array, Object], default: null },
    itemClassName: { type: [String, Array, Object], default: null },
    link: { type: Object as PropType<LINK | null>, default: null },
    separator: { type: String, default: ' ' },
    show: { type: Boolean, default: true },
    text: { type: String, default: null },
    type: { type: String, default: 'default' },
    value: { type: String, default: null },
    valueBefore: { type: [String, Number], default: null }, // TODO: obsolet?
  },
  setup(props: ChipItemProps) {
    return {
      dummy: props.show
    };
  },
});
