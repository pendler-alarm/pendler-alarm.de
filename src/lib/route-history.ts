import type { Coordinates } from '@/features/motis/location-service';
import { localStorageStore } from '@/lib/storage';

const ROUTE_HISTORY_KEY = 'pendler-alarm.route-history';
const MIN_ROUTE_DISTANCE_METERS = 750;
const MIN_ROUTE_DURATION_MINUTES = 3;
const MAX_ROUTE_DURATION_MINUTES = 240;
const RECURRING_ROUTE_SAMPLE_THRESHOLD = 3;
const DEFAULT_BIKE_SPEED_KMH = 15;

type StoredRouteHistoryEntry = {
  averageSpeedKmh: number;
  samples: number;
  updatedAt: string;
};

type StoredRouteHistory = Record<string, StoredRouteHistoryEntry>;

export type RouteProfile = {
  averageSpeedKmh: number;
  samples: number;
  isRecurring: boolean;
};

const roundCoordinate = (value: number): string => value.toFixed(3);

const toRouteKey = (origin: Coordinates, destination: Coordinates): string =>
  [
    roundCoordinate(origin.lat),
    roundCoordinate(origin.lon),
    roundCoordinate(destination.lat),
    roundCoordinate(destination.lon),
  ].join(':');

const isValidEntry = (value: unknown): value is StoredRouteHistoryEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<StoredRouteHistoryEntry>;
  return typeof entry.averageSpeedKmh === 'number'
    && Number.isFinite(entry.averageSpeedKmh)
    && typeof entry.samples === 'number'
    && Number.isFinite(entry.samples)
    && typeof entry.updatedAt === 'string';
};

const loadRouteHistory = (): StoredRouteHistory => localStorageStore.getJson(ROUTE_HISTORY_KEY, (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => isValidEntry(entry)),
  );
}) ?? {};

const storeRouteHistory = (history: StoredRouteHistory): void => {
  localStorageStore.setJson(ROUTE_HISTORY_KEY, history);
};

const toSpeedKmh = (distanceMeters: number, durationMinutes: number): number =>
  (distanceMeters / 1000) / (durationMinutes / 60);

const normalizeSpeed = (speedKmh: number): number =>
  Math.min(Math.max(speedKmh, 4), 80);

export const getRouteProfile = (
  origin: Coordinates | null | undefined,
  destination: Coordinates | null | undefined,
): RouteProfile | null => {
  if (!origin || !destination) {
    return null;
  }

  const entry = loadRouteHistory()[toRouteKey(origin, destination)];

  if (!entry) {
    return null;
  }

  return {
    averageSpeedKmh: entry.averageSpeedKmh,
    samples: entry.samples,
    isRecurring: entry.samples >= RECURRING_ROUTE_SAMPLE_THRESHOLD,
  };
};

export const recordRouteSample = (
  origin: Coordinates | null | undefined,
  destination: Coordinates | null | undefined,
  durationMinutes: number | null | undefined,
  distanceMeters: number | null | undefined,
): void => {
  if (!origin || !destination || !durationMinutes || !distanceMeters) {
    return;
  }

  if (
    !Number.isFinite(durationMinutes)
    || !Number.isFinite(distanceMeters)
    || durationMinutes < MIN_ROUTE_DURATION_MINUTES
    || durationMinutes > MAX_ROUTE_DURATION_MINUTES
    || distanceMeters < MIN_ROUTE_DISTANCE_METERS
  ) {
    return;
  }

  const history = loadRouteHistory();
  const key = toRouteKey(origin, destination);
  const nextSpeedKmh = normalizeSpeed(toSpeedKmh(distanceMeters, durationMinutes));
  const previous = history[key];
  const samples = (previous?.samples ?? 0) + 1;
  const weightedAverage = previous
    ? ((previous.averageSpeedKmh * previous.samples) + nextSpeedKmh) / samples
    : nextSpeedKmh;

  history[key] = {
    averageSpeedKmh: Number(weightedAverage.toFixed(1)),
    samples,
    updatedAt: new Date().toISOString(),
  };

  storeRouteHistory(history);
};

export const getFallbackBikeSpeedKmh = (): number => DEFAULT_BIKE_SPEED_KMH;
