import { translate } from '@/i18n';
import type { ChipProps, ChipType, ChipTypeConfig } from './Chip.d';
import { CHIP_TYPE_CONFIG, DEFAULT_CHIP_TYPE } from './Chip.config';
import { useI18n } from 'vue-i18n';

export const DEFAULT_CHIP_LINK_REL = ['noreferrer', 'noopener'].join(' ');
export const DEFAULT_CHIP_LINK_TARGET = '_blank';

export const toChipLabelKey = (type: ChipType, labelKey: string): string => {
  const config = getChipTypeConfig(type);
  const prefix = config?.i18nPrefix;
  const key = prefix ? `${prefix}.${labelKey}` : labelKey;
  const resolvedLabel = translate(key);
  return resolvedLabel;
};

export const getConfigClassName = (type: ChipType): string => {
  const config = getChipTypeConfig(type);
  return config.className;
};
export const getClassNames = (type: ChipType, isLink: boolean, additionalClassName?: string | null): string[] => {
  const configClassName = getConfigClassName(type);
  const linkClassName = isLink ? 'chip--interactive' : null;
  return ['chip', configClassName, linkClassName, additionalClassName].filter(Boolean) as string[];
};
export const getLinkAttributes = (link: ChipProps['link']): Record<string, string> => {
  if (!link) {
    return {};
  }
  return {
    href: link.href,
    target: link.target ?? DEFAULT_CHIP_LINK_TARGET,
    rel: link.rel ?? DEFAULT_CHIP_LINK_REL,
  };
};

export const getChipTypeConfig = (type: ChipType): ChipTypeConfig => {
  const config = CHIP_TYPE_CONFIG[type];
  if (!config) {
    return CHIP_TYPE_CONFIG[DEFAULT_CHIP_TYPE] as ChipTypeConfig;
  }
  return config;
};
export const getType = (value: ChipType | undefined): ChipType => {
  return value && value in CHIP_TYPE_CONFIG ? value : 'default';
}
export const getLabel = (type: ChipType, props: ChipProps): string => {
  if (props.text) {
    return props.text;
  }

  if (props.link?.text) {
    return props.link.text;
  }

  if (!props.labelKey) {
    return '';
  }
  return translate(toChipLabelKey(type, props.labelKey), props.labelParams ?? {});
};