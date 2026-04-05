import { translate } from '@/i18n';
import type { Coordinates } from '@/features/motis/location-service';

export type SharingProviderId = 'disabled' | 'nextbike' | 'custom';

export type SharingPreferences = {
  providerId: SharingProviderId;
  shortTripDistanceKm: number;
  stationSearchRadiusMeters: number;
  customProviderLabel: string;
  customGbfsUrl: string;
};

export type SharingStation = {
  name: string;
  address: string | null;
  distanceMeters: number;
  lat: number;
  lon: number;
  bikesAvailable: number | null;
  docksAvailable: number | null;
  isFreeFloating: boolean;
};

export type SharingSuggestion = {
  providerId: Exclude<SharingProviderId, 'disabled'>;
  providerLabel: string;
  tripDistanceMeters: number;
  maxTripDistanceMeters: number;
  stationSearchRadiusMeters: number;
  originStation: SharingStation | null;
  destinationStation: SharingStation | null;
};

type SharingFetchResult = {
  suggestion: SharingSuggestion | null;
  error: string | null;
};

type NextbikeResponse = {
  countries?: Array<{
    cities?: Array<{
      places?: Array<{
        lat?: number;
        lng?: number;
        name?: string;
        address?: string;
        bike?: boolean;
        bikes?: number;
        free_racks?: number;
      }>;
    }>;
  }>;
};

type GbfsFeed = {
  name?: string;
  url?: string;
};

type GbfsAutoDiscoveryResponse = {
  data?: Record<string, { feeds?: GbfsFeed[] }>;
};

type GbfsStationInformation = {
  station_id?: string;
  name?: string;
  address?: string;
  lat?: number;
  lon?: number;
};

type GbfsStationInformationResponse = {
  data?: {
    stations?: GbfsStationInformation[];
  };
};

type GbfsStationStatus = {
  station_id?: string;
  num_bikes_available?: number;
  num_docks_available?: number;
  is_renting?: boolean | number;
  is_returning?: boolean | number;
};

type GbfsStationStatusResponse = {
  data?: {
    stations?: GbfsStationStatus[];
  };
};

const DEFAULT_SHORT_TRIP_DISTANCE_KM = 5;
const DEFAULT_STATION_SEARCH_RADIUS_METERS = 1_200;
const DEFAULT_CUSTOM_PROVIDER_LABEL = 'GBFS';
const DEFAULT_PROVIDER_ID: SharingProviderId = 'nextbike';
const NEXTBIKE_PROVIDER_LABEL = 'nextbike';
const NEXTBIKE_API_URL = 'https://maps.nextbike.net/maps/nextbike-live.json';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toRad = (value: number): number => value * (Math.PI / 180);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getDefaultSharingPreferences = (): SharingPreferences => ({
  providerId: DEFAULT_PROVIDER_ID,
  shortTripDistanceKm: DEFAULT_SHORT_TRIP_DISTANCE_KM,
  stationSearchRadiusMeters: DEFAULT_STATION_SEARCH_RADIUS_METERS,
  customProviderLabel: DEFAULT_CUSTOM_PROVIDER_LABEL,
  customGbfsUrl: '',
});

export const getDistanceMeters = (from: Coordinates, to: Coordinates): number => {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const normalizePreferences = (preferences?: Partial<SharingPreferences>): SharingPreferences => {
  const defaults = getDefaultSharingPreferences();

  return {
    providerId: preferences?.providerId ?? defaults.providerId,
    shortTripDistanceKm: clamp(preferences?.shortTripDistanceKm ?? defaults.shortTripDistanceKm, 0.5, 25),
    stationSearchRadiusMeters: clamp(
      Math.round(preferences?.stationSearchRadiusMeters ?? defaults.stationSearchRadiusMeters),
      200,
      5_000,
    ),
    customProviderLabel: preferences?.customProviderLabel?.trim() || defaults.customProviderLabel,
    customGbfsUrl: preferences?.customGbfsUrl?.trim() || '',
  };
};

const requestJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}`);
  }

  return (await response.json()) as T;
};

const toSharingStation = (
  coordinates: Coordinates,
  station: Omit<SharingStation, 'distanceMeters'> & { lat: number; lon: number },
): SharingStation => ({
  name: station.name,
  address: station.address,
  distanceMeters: Math.round(getDistanceMeters(coordinates, { lat: station.lat, lon: station.lon })),
  lat: station.lat,
  lon: station.lon,
  bikesAvailable: station.bikesAvailable,
  docksAvailable: station.docksAvailable,
  isFreeFloating: station.isFreeFloating,
});

const parseNextbikeStations = (payload: NextbikeResponse, coordinates: Coordinates): SharingStation[] => {
  const places = (payload.countries ?? []).flatMap((country) =>
    (country.cities ?? []).flatMap((city) => city.places ?? []),
  );

  return places
    .filter((place) => isFiniteNumber(place.lat) && isFiniteNumber(place.lng))
    .map((place) => toSharingStation(coordinates, {
      name: place.name?.trim() || translate('views.dashboard.events.sharing.unknownStation'),
      address: place.address?.trim() || null,
      bikesAvailable: typeof place.bikes === 'number' ? place.bikes : place.bike ? 1 : null,
      docksAvailable: typeof place.free_racks === 'number' ? place.free_racks : null,
      isFreeFloating: Boolean(place.bike),
      lat: place.lat as number,
      lon: place.lng as number,
    }));
};

const fetchNextbikeStations = async (
  coordinates: Coordinates,
  radiusMeters: number,
): Promise<SharingStation[]> => {
  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lng: String(coordinates.lon),
    distance: String(radiusMeters),
    limit: '20',
  });

  const payload = await requestJson<NextbikeResponse>(`${NEXTBIKE_API_URL}?${params.toString()}`);
  return parseNextbikeStations(payload, coordinates).filter((station) => station.distanceMeters <= radiusMeters);
};

const getStationScore = (station: SharingStation, purpose: 'pickup' | 'dropoff'): number => {
  const availability = purpose === 'pickup'
    ? station.bikesAvailable ?? 0
    : station.docksAvailable ?? (station.isFreeFloating ? 1 : 0);
  const availabilityBoost = availability > 0 ? 100_000 : 0;
  const stationBoost = purpose === 'dropoff' && !station.isFreeFloating ? 10_000 : 0;

  return availabilityBoost + stationBoost - station.distanceMeters;
};

const pickBestStation = (
  stations: SharingStation[],
  purpose: 'pickup' | 'dropoff',
): SharingStation | null => {
  if (stations.length === 0) {
    return null;
  }

  return [...stations].sort((left, right) =>
    getStationScore(right, purpose) - getStationScore(left, purpose),
  )[0] ?? null;
};

const isTruthyAvailabilityFlag = (value: boolean | number | undefined): boolean =>
  value === undefined || value === true || value === 1;

const findGbfsFeedUrl = (payload: GbfsAutoDiscoveryResponse, feedName: string): string | null => {
  const languageBlocks = Object.values(payload.data ?? {});

  for (const block of languageBlocks) {
    const match = (block.feeds ?? []).find((feed) => feed.name === feedName && feed.url?.trim());
    if (match?.url) {
      return match.url.trim();
    }
  }

  return null;
};

const fetchGbfsStations = async (
  coordinates: Coordinates,
  radiusMeters: number,
  gbfsUrl: string,
): Promise<{ pickup: SharingStation | null; dropoff: SharingStation | null }> => {
  const discovery = await requestJson<GbfsAutoDiscoveryResponse>(gbfsUrl);
  const stationInformationUrl = findGbfsFeedUrl(discovery, 'station_information');
  const stationStatusUrl = findGbfsFeedUrl(discovery, 'station_status');

  if (!stationInformationUrl || !stationStatusUrl) {
    throw new Error('missing-gbfs-feeds');
  }

  const [stationInformation, stationStatus] = await Promise.all([
    requestJson<GbfsStationInformationResponse>(stationInformationUrl),
    requestJson<GbfsStationStatusResponse>(stationStatusUrl),
  ]);

  const statusById = new Map(
    (stationStatus.data?.stations ?? [])
      .filter((station) => station.station_id)
      .map((station) => [station.station_id as string, station]),
  );

  const stations = (stationInformation.data?.stations ?? [])
    .filter((station) => station.station_id && isFiniteNumber(station.lat) && isFiniteNumber(station.lon))
    .map((station) => {
      const status = statusById.get(station.station_id as string);

      return {
        stationId: station.station_id as string,
        station: toSharingStation(coordinates, {
          name: station.name?.trim() || translate('views.dashboard.events.sharing.unknownStation'),
          address: station.address?.trim() || null,
          bikesAvailable: typeof status?.num_bikes_available === 'number' ? status.num_bikes_available : null,
          docksAvailable: typeof status?.num_docks_available === 'number' ? status.num_docks_available : null,
          isFreeFloating: false,
          lat: station.lat as number,
          lon: station.lon as number,
        }),
      };
    })
    .filter((entry) => entry.station.distanceMeters <= radiusMeters);

  const pickupStations = stations
    .filter((entry) => {
      const status = statusById.get(entry.stationId);
      return (entry.station.bikesAvailable ?? 0) > 0 && isTruthyAvailabilityFlag(status?.is_renting);
    })
    .map((entry) => entry.station);

  const dropoffStations = stations
    .filter((entry) => {
      const status = statusById.get(entry.stationId);
      return (entry.station.docksAvailable ?? 0) > 0 && isTruthyAvailabilityFlag(status?.is_returning);
    })
    .map((entry) => entry.station);

  return {
    pickup: pickBestStation(pickupStations, 'pickup'),
    dropoff: pickBestStation(dropoffStations, 'dropoff'),
  };
};

const getProviderLabel = (preferences: SharingPreferences): string => {
  if (preferences.providerId === 'nextbike') {
    return NEXTBIKE_PROVIDER_LABEL;
  }

  return preferences.customProviderLabel;
};

export const findSharingSuggestion = async (
  origin: Coordinates | null | undefined,
  destination: Coordinates | null | undefined,
  preferences?: Partial<SharingPreferences>,
): Promise<SharingFetchResult> => {
  const normalizedPreferences = normalizePreferences(preferences);

  if (normalizedPreferences.providerId === 'disabled') {
    return {
      suggestion: null,
      error: null,
    };
  }

  if (!origin) {
    return {
      suggestion: null,
      error: translate('views.dashboard.events.sharing.originUnavailable'),
    };
  }

  if (!destination) {
    return {
      suggestion: null,
      error: translate('views.dashboard.events.sharing.destinationUnavailable'),
    };
  }

  if (normalizedPreferences.providerId === 'custom' && !normalizedPreferences.customGbfsUrl) {
    return {
      suggestion: null,
      error: translate('views.dashboard.events.sharing.customFeedMissing'),
    };
  }

  const tripDistanceMeters = Math.round(getDistanceMeters(origin, destination));
  const maxTripDistanceMeters = Math.round(normalizedPreferences.shortTripDistanceKm * 1_000);

  if (tripDistanceMeters > maxTripDistanceMeters) {
    return {
      suggestion: null,
      error: null,
    };
  }

  const providerLabel = getProviderLabel(normalizedPreferences);

  try {
    let originStation: SharingStation | null = null;
    let destinationStation: SharingStation | null = null;

    if (normalizedPreferences.providerId === 'nextbike') {
      const [originStations, destinationStations] = await Promise.all([
        fetchNextbikeStations(origin, normalizedPreferences.stationSearchRadiusMeters),
        fetchNextbikeStations(destination, normalizedPreferences.stationSearchRadiusMeters),
      ]);

      originStation = pickBestStation(originStations, 'pickup');
      destinationStation = pickBestStation(destinationStations.filter((station) => !station.isFreeFloating), 'dropoff');
    } else {
      const [originResult, destinationResult] = await Promise.all([
        fetchGbfsStations(origin, normalizedPreferences.stationSearchRadiusMeters, normalizedPreferences.customGbfsUrl),
        fetchGbfsStations(destination, normalizedPreferences.stationSearchRadiusMeters, normalizedPreferences.customGbfsUrl),
      ]);

      originStation = originResult.pickup;
      destinationStation = destinationResult.dropoff;
    }

    if (!originStation && !destinationStation) {
      return {
        suggestion: null,
        error: translate('views.dashboard.events.sharing.noneFound', { provider: providerLabel }),
      };
    }

    return {
      suggestion: {
        providerId: normalizedPreferences.providerId,
        providerLabel,
        tripDistanceMeters,
        maxTripDistanceMeters,
        stationSearchRadiusMeters: normalizedPreferences.stationSearchRadiusMeters,
        originStation,
        destinationStation,
      },
      error: null,
    };
  } catch {
    return {
      suggestion: null,
      error: translate('views.dashboard.events.sharing.loadFailed', { provider: providerLabel }),
    };
  }
};
