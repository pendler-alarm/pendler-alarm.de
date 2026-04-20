import type { CHIP_CONFIG, ChipTypeConfig } from './Chip.d';

export const DEFAULT_CHIP_TYPE = 'default';

export const CHIP_TYPE_CONFIG: CHIP_CONFIG = {
    [DEFAULT_CHIP_TYPE]: {
        className: 'chip--default',
    },
    good: {
        className: 'chip--good',
    },
    warn: {
        className: 'chip--warn',
    },
    bad: {
        className: 'chip--bad',
    },
    link: {
        className: 'chip--link',
    },
    connection: {
        className: 'chip--default',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-good': {
        className: 'chip--good',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-warn': {
        className: 'chip--warn',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-bad': {
        className: 'chip--bad',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-link': {
        className: 'chip--link',
        i18nPrefix: 'views.dashboard.events.connection',
    },
} as const satisfies Record<string, ChipTypeConfig>;