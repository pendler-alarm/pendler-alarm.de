import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  buildStationInfoUrl,
  formatConnectionServiceLabel,
  formatDistanceMeters,
  formatProbability,
  getStationInfoProviderLabel,
} from '@/components/connection/connection-utils';
import type { ChipLink } from '@/components/Chip/Chip.d';
import { getDistanceMeters } from '@/features/sharing/sharing-service';
import type { Coordinates } from '@/features/motis/location-service';
import type {
  ConnectionMobilityHubGroup,
  MobilityHubParkingSite,
  MobilityHubSharingStation,
} from '@/features/motis/routing-service.d';
import type { ConnectionRouteDetailProps, DetailTone } from './ConnectionRouteDetail.d';

type SharingCategory = {
  contentId: string;
  id: 'car' | 'bike' | 'scooter';
  title: string;
  icon: string;
  overflowStations: MobilityHubSharingStation[];
  previewStations: MobilityHubSharingStation[];
};

type ParkingCategory = {
  contentId: string;
  id: 'bike' | 'car';
  title: string;
  overflowSites: MobilityHubParkingSite[];
  previewSites: MobilityHubParkingSite[];
};

export const normalizeComparableText = (value: string): string => value
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '')
  .trim();

const dedupeAddressParts = (address: string): string => {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const seen = new Set<string>();

  return parts.filter((part) => {
    const key = normalizeComparableText(part);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).join(', ');
};

const toRad = (value: number): number => (value * Math.PI) / 180;

const getDistanceKilometers = (
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number => {
  const radius = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistanceKilometers = (distanceKilometers: number): string => (
  `${distanceKilometers < 10 ? distanceKilometers.toFixed(2) : distanceKilometers.toFixed(1)} km`
);

export const normalizeOperatorLabel = (operator: string | null, fallback: string): string => {
  if (!operator) {
    return fallback;
  }

  const normalized = operator
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return normalized
    .split(' ')
    .map((token: string) => token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : token)
    .join(' ');
};

const toSortedByDistance = <T>(items: T[], getDistanceKm: (item: T) => number | null): T[] => (
  [...items].sort((left, right) => (getDistanceKm(left) ?? Number.POSITIVE_INFINITY) - (getDistanceKm(right) ?? Number.POSITIVE_INFINITY))
);
const toPreviewStations = (stations: MobilityHubSharingStation[]) => ({
  overflowStations: stations.slice(3),
  previewStations: stations.slice(0, 3),
});
const toPreviewSites = (sites: MobilityHubParkingSite[]) => ({
  overflowSites: sites.slice(3),
  previewSites: sites.slice(0, 3),
});

export const useConnectionRouteDetail = (props: ConnectionRouteDetailProps) => {
  const { t } = useI18n();

  // adress at start and end
  const stopAddress = computed(() => {
    const isSameAsStopName = (address: string): boolean => (
      normalizeComparableText(address) === normalizeComparableText(props.stop.name)
    );

    if (props.stop.kind === 'start') {
      const normalizedOriginAddress = props.originAddress ? dedupeAddressParts(props.originAddress) : null;
      return normalizedOriginAddress && !isSameAsStopName(normalizedOriginAddress) ? normalizedOriginAddress : null;
    }

    if (props.stop.kind === 'end') {
      const normalizedDestinationAddress = props.destinationAddress ? dedupeAddressParts(props.destinationAddress) : null;
      return normalizedDestinationAddress && !isSameAsStopName(normalizedDestinationAddress) ? normalizedDestinationAddress : null;
    }

    return null;
  });

  const getTransferMinutes = (): number | null => {
    if (!props.stop.incomingSegment?.arrivalIso || !props.stop.outgoingSegment?.departureIso) {
      return null;
    }

    const diffMs = new Date(props.stop.outgoingSegment.departureIso).getTime() - new Date(props.stop.incomingSegment.arrivalIso).getTime();

    if (Number.isNaN(diffMs) || diffMs <= 0) {
      return null;
    }

    return Math.round(diffMs / 60_000);
  };

  const transferLabel = computed(() => {
    if (!props.stop.incomingSegment || !props.stop.outgoingSegment) {
      return null;
    }

    const transferMinutes = getTransferMinutes();

    return transferMinutes !== null && transferMinutes > 0
      ? t('views.dashboard.events.connection.transferBetweenWithTime', {
        from: formatConnectionServiceLabel(props.stop.incomingSegment),
        to: formatConnectionServiceLabel(props.stop.outgoingSegment),
        count: transferMinutes,
      })
      : t('views.dashboard.events.connection.transferBetween', {
        from: formatConnectionServiceLabel(props.stop.incomingSegment),
        to: formatConnectionServiceLabel(props.stop.outgoingSegment),
      });
  });

  const getTransferCoordinates = (): { from: Coordinates | null; to: Coordinates | null } | null => {
    const transferWalk = props.stop.outgoingSegment?.productType === 'walk' ? props.stop.outgoingSegment : null;

    if (transferWalk) {
      return {
        from: transferWalk.fromCoordinates,
        to: transferWalk.toCoordinates,
      };
    }

    if (!props.stop.incomingSegment || !props.stop.outgoingSegment) {
      return null;
    }

    return {
      from: props.stop.incomingSegment.toCoordinates,
      to: props.stop.outgoingSegment.fromCoordinates,
    };
  };

  const transferDistanceLabel = computed(() => {
    const transferCoordinates = getTransferCoordinates();

    if (!transferCoordinates?.from || !transferCoordinates.to) {
      return null;
    }

    return formatDistanceMeters(Math.round(getDistanceMeters(transferCoordinates.from, transferCoordinates.to)));
  });

  const transferRouteUrl = computed(() => {
    const transferCoordinates = getTransferCoordinates();

    if (!transferCoordinates?.from || !transferCoordinates.to) {
      return null;
    }

    const params = new URLSearchParams({
      engine: 'fossgis_osrm_foot',
      route: `${transferCoordinates.from.lat},${transferCoordinates.from.lon};${transferCoordinates.to.lat},${transferCoordinates.to.lon}`,
    });

    return `https://www.openstreetmap.org/directions?${params.toString()}`;
  });

  const hasStationChange = computed(() => {
    const transferWalk = props.stop.outgoingSegment?.productType === 'walk' ? props.stop.outgoingSegment : null;

    if (transferWalk) {
      const fromKey = transferWalk.fromStopId ?? transferWalk.fromStop.trim().toLowerCase();
      const toKey = transferWalk.toStopId ?? transferWalk.toStop.trim().toLowerCase();

      return fromKey !== toKey;
    }

    if (!props.stop.incomingSegment || !props.stop.outgoingSegment) {
      return false;
    }

    const incomingKey = props.stop.incomingSegment.toStopId ?? props.stop.incomingSegment.toStop.trim().toLowerCase();
    const outgoingKey = props.stop.outgoingSegment.fromStopId ?? props.stop.outgoingSegment.fromStop.trim().toLowerCase();

    return incomingKey !== outgoingKey;
  });

  const shouldShowIncomingLine = computed(() => !(
    hasStationChange.value && props.stop.incomingSegment?.productType === 'walk'
  ));

  const shouldShowOutgoingLine = computed(() => !(
    hasStationChange.value && props.stop.outgoingSegment?.productType === 'walk'
  ));

  const getTransferTone = (successProbability: number | null): DetailTone => {
    if (successProbability === null) {
      return 'neutral';
    }

    if (successProbability >= 0.8) {
      return 'good';
    }

    if (successProbability >= 0.5) {
      return 'warn';
    }

    return 'bad';
  };

  const transferTone = computed(() => getTransferTone(props.transferAssessment?.successProbability ?? null));

  const transferFeasibilityLabel = computed(() => {
    const probability = formatProbability(props.transferAssessment?.successProbability ?? null);
    return probability ? t('views.dashboard.events.connection.transferPossibleShort', { value: probability }) : null;
  });

  const missedProbabilityLabel = computed(() => formatProbability(props.transferAssessment?.missedProbability ?? null));

  const transferStationChangeLabel = computed(() => (
    hasStationChange.value ? t('views.dashboard.events.connection.transferStationChange') : null
  ));

  const transferWalkSummary = computed(() => {
    if (!hasStationChange.value) {
      return null;
    }

    return t('views.dashboard.events.connection.transferWalkSummary', {
      from: props.stop.incomingSegment?.toStop ?? props.stop.name,
      to: props.stop.outgoingSegment?.productType === 'walk'
        ? props.stop.outgoingSegment.toStop
        : props.stop.outgoingSegment?.fromStop ?? props.stop.name,
    });
  });

  const getStationLink = (stopName: string, stopId?: string | null): string => buildStationInfoUrl(stopName, stopId);

  const getStationProvider = (stopName: string, stopId?: string | null): string => getStationInfoProviderLabel(stopName, stopId);

  const incomingStationLink = computed<ChipLink | null>(() => {
    if (!props.stop.incomingSegment) {
      return null;
    }

    return {
      href: getStationLink(props.stop.incomingSegment.toStop, props.stop.incomingSegment.toStopId),
      text: t('views.dashboard.events.connection.stationInfoLink', {
        stop: props.stop.incomingSegment.toStop,
        provider: getStationProvider(props.stop.incomingSegment.toStop, props.stop.incomingSegment.toStopId),
      }),
    };
  });

  const outgoingWalkStationLink = computed<ChipLink | null>(() => {
    if (!props.stop.outgoingSegment || props.stop.outgoingSegment.productType !== 'walk') {
      return null;
    }

    return {
      href: getStationLink(props.stop.outgoingSegment.toStop, props.stop.outgoingSegment.toStopId),
      text: t('views.dashboard.events.connection.stationInfoLink', {
        stop: props.stop.outgoingSegment.toStop,
        provider: getStationProvider(props.stop.outgoingSegment.toStop, props.stop.outgoingSegment.toStopId),
      }),
    };
  });

  const transferRouteLink = computed<ChipLink | null>(() => {
    if (!transferRouteUrl.value) {
      return null;
    }

    return {
      href: transferRouteUrl.value,
      text: t('views.dashboard.events.connection.debugTransferRouteLink'),
    };
  });

  const getPurposeLabel = (purpose: string | null): string => {
    switch (purpose?.toUpperCase()) {
      case 'BIKE':
        return t('views.dashboard.events.connection.mobility.purposeBike');
      case 'CAR':
        return t('views.dashboard.events.connection.mobility.purposeCar');
      default:
        return t('views.dashboard.events.connection.mobility.purposeUnknown');
    }
  };

  const stopMobilityHubGroup = computed<ConnectionMobilityHubGroup | null>(() => {
    if (!props.delayPrediction) {
      return null;
    }

    if (props.stop.kind === 'start') {
      return props.delayPrediction.originMobilityHubs;
    }

    if (props.stop.kind === 'end') {
      return props.delayPrediction.destinationMobilityHubs;
    }

    return null;
  });

  const hasStopMobilityHubData = computed(() => {
    const group = stopMobilityHubGroup.value;

    if (!group) {
      return false;
    }

    return group.parkingSites.length > 0 || group.sharingStations.length > 0;
  });

  const getStationDistanceKm = (station: MobilityHubSharingStation): number | null => {
    const group = stopMobilityHubGroup.value;

    if (!group) {
      return null;
    }

    return getDistanceKilometers(
      { lat: group.lat, lon: group.lon },
      { lat: station.lat, lon: station.lon },
    );
  };

  const getParkingDistanceKm = (site: MobilityHubParkingSite): number | null => {
    const group = stopMobilityHubGroup.value;

    if (!group) {
      return null;
    }

    return getDistanceKilometers(
      { lat: group.lat, lon: group.lon },
      { lat: site.lat, lon: site.lon },
    );
  };

  const getSharingCategory = (station: MobilityHubSharingStation): SharingCategory['id'] | null => {
    const modes = station.realtimeAvailability.map((entry) => entry.mode.toLowerCase());

    if (modes.includes('car')) {
      return 'car';
    }

    if (modes.includes('bike')) {
      return 'bike';
    }

    if (modes.includes('scooter')) {
      return 'scooter';
    }

    return null;
  };

  const sharingCategories = computed<SharingCategory[]>(() => {
    const stations = stopMobilityHubGroup.value?.sharingStations ?? [];
    const grouped = {
      car: [] as MobilityHubSharingStation[],
      bike: [] as MobilityHubSharingStation[],
      scooter: [] as MobilityHubSharingStation[],
    };

    stations.forEach((station) => {
      const category = getSharingCategory(station);

      if (category) {
        grouped[category].push(station);
      }
    });

    const base = [
      {
        contentId: `sharing-${props.stop.key}-car`,
        id: 'car' as const,
        title: t('views.dashboard.events.connection.mobility.carsharing'),
        icon: 'material/directions_car',
        ...toPreviewStations(toSortedByDistance(grouped.car, getStationDistanceKm)),
      },
      {
        contentId: `sharing-${props.stop.key}-bike`,
        id: 'bike' as const,
        title: t('views.dashboard.events.connection.mobility.bikesharing'),
        icon: 'material/directions_bike',
        ...toPreviewStations(toSortedByDistance(grouped.bike, getStationDistanceKm)),
      },
      {
        contentId: `sharing-${props.stop.key}-scooter`,
        id: 'scooter' as const,
        title: t('views.dashboard.events.connection.mobility.scootersharing'),
        icon: 'material/electric_scooter',
        ...toPreviewStations(toSortedByDistance(grouped.scooter, getStationDistanceKm)),
      },
    ];

    return base.filter((entry) => entry.previewStations.length > 0);
  });

  const parkingCategories = computed<ParkingCategory[]>(() => {
    const sites = stopMobilityHubGroup.value?.parkingSites ?? [];
    const bikeSites = toSortedByDistance(
      sites.filter((site) => site.purpose?.toUpperCase() === 'BIKE'),
      getParkingDistanceKm,
    );
    const carSites = toSortedByDistance(
      sites.filter((site) => site.purpose?.toUpperCase() === 'CAR'),
      getParkingDistanceKm,
    );

    return [
      {
        contentId: `parking-${props.stop.key}-bike`,
        id: 'bike' as const,
        title: t('views.dashboard.events.connection.mobility.bicycleParking'),
        ...toPreviewSites(bikeSites),
      },
      {
        contentId: `parking-${props.stop.key}-car`,
        id: 'car' as const,
        title: t('views.dashboard.events.connection.mobility.carParking'),
        ...toPreviewSites(carSites),
      },
    ].filter((entry) => entry.previewSites.length > 0);
  });

  const getSharingDistanceLabel = (station: MobilityHubSharingStation): string => (
    formatDistanceKilometers(getStationDistanceKm(station) ?? 0)
  );

  const getParkingDistanceLabel = (site: MobilityHubParkingSite): string => (
    formatDistanceKilometers(getParkingDistanceKm(site) ?? 0)
  );

  return {
    formatConnectionServiceLabel,
    formatProbability,
    getParkingDistanceLabel,
    getPurposeLabel,
    getSharingDistanceLabel,
    hasStationChange,
    hasStopMobilityHubData,
    incomingStationLink,
    missedProbabilityLabel,
    normalizeOperatorLabel: (operator: string | null) => normalizeOperatorLabel(
      operator,
      t('views.dashboard.events.connection.mobility.unknownOperator'),
    ),
    outgoingWalkStationLink,
    parkingCategories,
    sharingCategories,
    shouldShowIncomingLine,
    shouldShowOutgoingLine,
    stopAddress,
    stopMobilityHubGroup,
    t,
    transferDistanceLabel,
    transferFeasibilityLabel,
    transferLabel,
    transferRouteLink,
    transferStationChangeLabel,
    transferRouteUrl,
    transferTone,
    transferWalkSummary,
  };
};
