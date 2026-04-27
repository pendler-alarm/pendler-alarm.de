import type { CHIP_CONFIG, ChipTypeConfig } from './Chip.d';

export const DEFAULT_CHIP_TYPE = 'default';

export const CHIP_TYPE_CONFIG: CHIP_CONFIG = {
    [DEFAULT_CHIP_TYPE]: {
        className: 'chip--default',
    },
    white: {
        className: 'chip--white',
    },
    good: {
        className: 'chip--good',
    },
    success: {
        className: 'chip--good',
    },
    blank: {
        className: '',
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
    gray: {
        className: 'chip--gray',
    },
    connection: {
        className: 'chip--default',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-good': {
        className: 'chip--good',
        i18nPrefix: 'views.dashboard.events.connection',
    },
    'connection-offset': {
        className: 'connection-route-offset',
    },
    'connection-time': {
        className: 'chip--time',
    },
    'blue': {
        className: 'chip--blue',
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