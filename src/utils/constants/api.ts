const GOOGLE_API = 'https://www.googleapis.com';
const MOTIS_API = 'https://api.transitous.org';
const PENDLER_ALARM_API = 'https://ola-vm.duckdns.org';
const TRAIN_ISP_CHECK_API = 'https://train-isp-check.vercel.app';
// const TRAIN_ISP_CHECK_API = 'https://train-isp-check-lrri.vercel.app';

export const GOOGLE_API_CALENDAR_EVENTS = `${GOOGLE_API}/calendar/v3/calendars/primary/events`;

export const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CALENDAR_SCOPE = `${GOOGLE_API}/auth/calendar`;

export const MOTIS_API_GEOCODE = `${MOTIS_API}/api/v1/geocode`;
export const MOTIS_API_REVERSE_GEOCODE = `${MOTIS_API}/api/v1/reverse-geocode`;
export const MOTIS_API_PLAN = `${MOTIS_API}/api/v5/plan`;

export const PENDLER_ALARM_API_DELAY_PREDICTIONS = `${PENDLER_ALARM_API}/api/delay-predictions`;
export const PENDLER_ALARM_API_WORKFLOW_STATIONS = `${PENDLER_ALARM_API}/api/workflow/stations`;
export const TRAIN_ISP_CHECK_API_CHECK = `${TRAIN_ISP_CHECK_API}/api/check`;
