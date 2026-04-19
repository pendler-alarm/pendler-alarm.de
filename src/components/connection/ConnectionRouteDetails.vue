<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import {
  buildStationInfoUrl,
  formatConnectionServiceLabel,
  formatDelayMinutes,
  formatDistanceMeters,
  formatProbability,
  getConnectionProductEmoji,
  getConnectionProductFallbackLabel,
  getConnectionProductIcon,
  getStationInfoProviderLabel,
} from '@/components/connection/connection-utils';
import { getDistanceMeters } from '@/features/sharing/sharing-service';
import type { Coordinates } from '@/features/motis/location-service';
import type {
  ConnectionMobilityHubGroup,
  ConnectionDelayCall,
  ConnectionDelayPrediction,
  ConnectionOption,
  ConnectionSegment,
  ConnectionTransferAssessment,
  MobilityHubParkingSite,
  MobilityHubSharingStation,
} from '@/features/motis/routing-service';

const props = defineProps<{
  option: ConnectionOption;
  title?: string;
  delayPrediction?: ConnectionDelayPrediction | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
}>();

const { t } = useI18n();
const selectedStopIndex = ref<number | null>(null);
const expandedMobilityGroups = ref<Record<string, boolean>>({});

type DelayBand = {
  key: string;
  label: string;
  probability: number;
  tone: 'good' | 'warn' | 'bad';
};

type RouteStopEntry = {
  key: string;
  kind: 'start' | 'stop' | 'end';
  name: string;
  minuteOffset: number | null;
  arrivalTime: string | null;
  departureTime: string | null;
  incomingSegment: ConnectionSegment | null;
  outgoingSegment: ConnectionSegment | null;
};

const getMinuteOffset = (value: string | null, reference: string | null): number | null => {
  if (!value || !reference) {
    return null;
  }

  const diffMs = new Date(value).getTime() - new Date(reference).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const routeStops = computed<RouteStopEntry[]>(() => {
  if (props.option.segments.length === 0) {
    return [];
  }

  const entries: RouteStopEntry[] = [];
  const [firstSegment] = props.option.segments;

  if (firstSegment) {
    entries.push({
      key: `${firstSegment.id}-start`,
      kind: 'start',
      name: firstSegment.fromStop,
      minuteOffset: 0,
      arrivalTime: null,
      departureTime: firstSegment.departureTime,
      incomingSegment: null,
      outgoingSegment: firstSegment,
    });
  }

  props.option.segments.forEach((segment, index) => {
    const nextSegment = props.option.segments[index + 1] ?? null;
    const isLast = index === props.option.segments.length - 1;

    entries.push({
      key: `${segment.id}-end`,
      kind: isLast ? 'end' : 'stop',
      name: segment.toStop,
      minuteOffset: getMinuteOffset(segment.arrivalIso, props.option.departureIso),
      arrivalTime: segment.arrivalTime,
      departureTime: nextSegment?.departureTime ?? null,
      incomingSegment: segment,
      outgoingSegment: nextSegment,
    });
  });

  return entries;
});

const toggleStop = (index: number): void => {
  selectedStopIndex.value = selectedStopIndex.value === index ? null : index;
};

const isPastStop = (index: number): boolean =>
  selectedStopIndex.value !== null && index < selectedStopIndex.value;

const isSelectedStop = (index: number): boolean => selectedStopIndex.value === index;

const getStopMarkerSegment = (stop: RouteStopEntry): ConnectionSegment | null => stop.outgoingSegment ?? stop.incomingSegment;

const getStopMarkerEmoji = (stop: RouteStopEntry): string | null => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment
    ? getConnectionProductEmoji(markerSegment.productType, { isDestination: stop.kind === 'end' })
    : (stop.kind === 'end' ? '🎯' : null);
};

const getStopMarkerIcon = (stop: RouteStopEntry): string | null => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment ? getConnectionProductIcon(markerSegment.productType) : null;
};

const getStopMarkerFallbackLabel = (stop: RouteStopEntry): string => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment ? getConnectionProductFallbackLabel(markerSegment.productType) : '•';
};

const getOffsetLabel = (stop: RouteStopEntry): string | null => {
  if (stop.minuteOffset === null || stop.minuteOffset <= 0) {
    return null;
  }

  return t('views.dashboard.events.connection.minutesFromStart', { count: stop.minuteOffset });
};

const getStopMeta = (stop: RouteStopEntry): string => {
  if (stop.kind === 'start') {
    return `${t('views.dashboard.events.connection.startLabel')} · ${t('views.dashboard.events.connection.departureLabel')} ${stop.departureTime ?? ''}`.trim();
  }

  if (stop.kind === 'end') {
    return `${t('views.dashboard.events.connection.endLabel')} · ${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime ?? ''}`.trim();
  }

  return [
    stop.arrivalTime ? `${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime}` : null,
    stop.departureTime ? `${t('views.dashboard.events.connection.continueLabel')} ${stop.departureTime}` : null,
  ].filter(Boolean).join(' · ');
};

const getTransferMinutes = (stop: RouteStopEntry): number | null => {
  if (!stop.incomingSegment?.arrivalIso || !stop.outgoingSegment?.departureIso) {
    return null;
  }

  const diffMs = new Date(stop.outgoingSegment.departureIso).getTime() - new Date(stop.incomingSegment.arrivalIso).getTime();

  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const getTransferLabel = (stop: RouteStopEntry): string | null => {
  if (!stop.incomingSegment || !stop.outgoingSegment) {
    return null;
  }

  const transferMinutes = getTransferMinutes(stop);

  return transferMinutes !== null && transferMinutes > 0
    ? t('views.dashboard.events.connection.transferBetweenWithTime', {
      from: formatConnectionServiceLabel(stop.incomingSegment),
      to: formatConnectionServiceLabel(stop.outgoingSegment),
      count: transferMinutes,
    })
    : t('views.dashboard.events.connection.transferBetween', {
      from: formatConnectionServiceLabel(stop.incomingSegment),
      to: formatConnectionServiceLabel(stop.outgoingSegment),
    });
};

const getTransferCoordinates = (stop: RouteStopEntry): { from: Coordinates | null; to: Coordinates | null } | null => {
  const transferWalk = stop.outgoingSegment?.productType === 'walk' ? stop.outgoingSegment : null;

  if (transferWalk) {
    return {
      from: transferWalk.fromCoordinates,
      to: transferWalk.toCoordinates,
    };
  }

  if (!stop.incomingSegment || !stop.outgoingSegment) {
    return null;
  }

  return {
    from: stop.incomingSegment.toCoordinates,
    to: stop.outgoingSegment.fromCoordinates,
  };
};

const getTransferDistanceLabel = (stop: RouteStopEntry): string | null => {
  const transferCoordinates = getTransferCoordinates(stop);

  if (!transferCoordinates?.from || !transferCoordinates.to) {
    return null;
  }

  return formatDistanceMeters(Math.round(getDistanceMeters(transferCoordinates.from, transferCoordinates.to)));
};

const getTransferRouteUrl = (stop: RouteStopEntry): string | null => {
  const transferCoordinates = getTransferCoordinates(stop);

  if (!transferCoordinates?.from || !transferCoordinates.to) {
    return null;
  }

  const params = new URLSearchParams({
    engine: 'fossgis_osrm_foot',
    route: `${transferCoordinates.from.lat},${transferCoordinates.from.lon};${transferCoordinates.to.lat},${transferCoordinates.to.lon}`,
  });

  return `https://www.openstreetmap.org/directions?${params.toString()}`;
};

const hasStationChange = (stop: RouteStopEntry): boolean => {
  const transferWalk = stop.outgoingSegment?.productType === 'walk' ? stop.outgoingSegment : null;

  if (transferWalk) {
    const fromKey = transferWalk.fromStopId ?? transferWalk.fromStop.trim().toLowerCase();
    const toKey = transferWalk.toStopId ?? transferWalk.toStop.trim().toLowerCase();

    return fromKey !== toKey;
  }

  if (!stop.incomingSegment || !stop.outgoingSegment) {
    return false;
  }

  const incomingKey = stop.incomingSegment.toStopId ?? stop.incomingSegment.toStop.trim().toLowerCase();
  const outgoingKey = stop.outgoingSegment.fromStopId ?? stop.outgoingSegment.fromStop.trim().toLowerCase();

  return incomingKey !== outgoingKey;
};

const getStopAddress = (stop: RouteStopEntry): string | null => {
  const normalizeComparableText = (value: string): string => value
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, '')
    .trim();

  const isSameAsStopName = (address: string): boolean =>
    normalizeComparableText(address) === normalizeComparableText(stop.name);

  const dedupeAddressParts = (address: string): string => {
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    const seen = new Set<string>();
    const uniqueParts = parts.filter((part) => {
      const key = normalizeComparableText(part);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    return uniqueParts.join(', ');
  };

  if (stop.kind === 'start') {
    const originAddress = props.originAddress ?? null;
    const normalizedOriginAddress = originAddress ? dedupeAddressParts(originAddress) : null;
    return normalizedOriginAddress && !isSameAsStopName(normalizedOriginAddress) ? normalizedOriginAddress : null;
  }

  if (stop.kind === 'end') {
    const destinationAddress = props.destinationAddress ?? null;
    const normalizedDestinationAddress = destinationAddress ? dedupeAddressParts(destinationAddress) : null;
    return normalizedDestinationAddress && !isSameAsStopName(normalizedDestinationAddress) ? normalizedDestinationAddress : null;
  }

  return null;
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

const normalizeOperatorLabel = (operator: string | null): string => {
  if (!operator) {
    return t('views.dashboard.events.connection.mobility.unknownOperator');
  }

  const normalized = operator
    .replaceAll(/[_-]+/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();

  return normalized
    .split(' ')
    .map((token) => token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : token)
    .join(' ');
};

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

const getStopMobilityHubGroup = (stop: RouteStopEntry): ConnectionMobilityHubGroup | null => {
  if (!props.delayPrediction) {
    return null;
  }

  if (stop.kind === 'start') {
    return props.delayPrediction.originMobilityHubs;
  }

  if (stop.kind === 'end') {
    return props.delayPrediction.destinationMobilityHubs;
  }

  return null;
};

const hasStopMobilityHubData = (stop: RouteStopEntry): boolean => {
  const group = getStopMobilityHubGroup(stop);

  if (!group) {
    return false;
  }

  return group.parkingSites.length > 0 || group.sharingStations.length > 0;
};

const getStopSharingStations = (stop: RouteStopEntry): MobilityHubSharingStation[] =>
  getStopMobilityHubGroup(stop)?.sharingStations ?? [];

const getStopParkingSites = (stop: RouteStopEntry): MobilityHubParkingSite[] =>
  getStopMobilityHubGroup(stop)?.parkingSites ?? [];

const getStationDistanceKm = (stop: RouteStopEntry, station: MobilityHubSharingStation): number | null => {
  const group = getStopMobilityHubGroup(stop);

  if (!group) {
    return null;
  }

  return getDistanceKilometers(
    { lat: group.lat, lon: group.lon },
    { lat: station.lat, lon: station.lon },
  );
};

const getParkingDistanceKm = (stop: RouteStopEntry, site: MobilityHubParkingSite): number | null => {
  const group = getStopMobilityHubGroup(stop);

  if (!group) {
    return null;
  }

  return getDistanceKilometers(
    { lat: group.lat, lon: group.lon },
    { lat: site.lat, lon: site.lon },
  );
};

const toSortedByDistance = <T>(items: T[], getDistanceKm: (item: T) => number | null): T[] => (
  [...items].sort((left, right) => (getDistanceKm(left) ?? Number.POSITIVE_INFINITY) - (getDistanceKm(right) ?? Number.POSITIVE_INFINITY))
);

type SharingCategory = {
  id: 'car' | 'bike' | 'scooter';
  title: string;
  icon: string;
  stations: MobilityHubSharingStation[];
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

const getSharingCategories = (stop: RouteStopEntry): SharingCategory[] => {
  const stations = getStopSharingStations(stop);
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
      id: 'car' as const,
      title: t('views.dashboard.events.connection.mobility.carsharing'),
      icon: 'material/directions_car',
      stations: toSortedByDistance(grouped.car, (station) => getStationDistanceKm(stop, station)),
    },
    {
      id: 'bike' as const,
      title: t('views.dashboard.events.connection.mobility.bikesharing'),
      icon: 'material/directions_bike',
      stations: toSortedByDistance(grouped.bike, (station) => getStationDistanceKm(stop, station)),
    },
    {
      id: 'scooter' as const,
      title: t('views.dashboard.events.connection.mobility.scootersharing'),
      icon: 'material/electric_scooter',
      stations: toSortedByDistance(grouped.scooter, (station) => getStationDistanceKm(stop, station)),
    },
  ];

  return base.filter((entry) => entry.stations.length > 0);
};

type ParkingCategory = {
  id: 'bike' | 'car';
  title: string;
  sites: MobilityHubParkingSite[];
};

const getParkingCategories = (stop: RouteStopEntry): ParkingCategory[] => {
  const sites = getStopParkingSites(stop);
  const bikeSites = toSortedByDistance(
    sites.filter((site) => site.purpose?.toUpperCase() === 'BIKE'),
    (site) => getParkingDistanceKm(stop, site),
  );
  const carSites = toSortedByDistance(
    sites.filter((site) => site.purpose?.toUpperCase() === 'CAR'),
    (site) => getParkingDistanceKm(stop, site),
  );

  return [
    { id: 'bike' as const, title: t('views.dashboard.events.connection.mobility.bicycleParking'), sites: bikeSites },
    { id: 'car' as const, title: t('views.dashboard.events.connection.mobility.carParking'), sites: carSites },
  ].filter((entry) => entry.sites.length > 0);
};

const getMobilityMoreKey = (stop: RouteStopEntry, section: 'sharing' | 'parking', category: string): string =>
  `${stop.key}-${section}-${category}`;

const isMobilityExpanded = (key: string): boolean => expandedMobilityGroups.value[key] === true;

const toggleMobilityExpanded = (key: string): void => {
  expandedMobilityGroups.value = {
    ...expandedMobilityGroups.value,
    [key]: !isMobilityExpanded(key),
  };
};

const getVisibleItems = <T>(items: T[], key: string): T[] => (
  isMobilityExpanded(key) ? items : items.slice(0, 3)
);

const getSharingDistanceLabel = (stop: RouteStopEntry, station: MobilityHubSharingStation): string =>
  formatDistanceKilometers(getStationDistanceKm(stop, station) ?? 0);

const getParkingDistanceLabel = (stop: RouteStopEntry, site: MobilityHubParkingSite): string =>
  formatDistanceKilometers(getParkingDistanceKm(stop, site) ?? 0);

const getTransitIncomingSegment = (index: number): ConnectionSegment | null => {
  const stop = routeStops.value[index];

  if (!stop) {
    return null;
  }

  if (stop.incomingSegment?.productType !== 'walk') {
    return stop.incomingSegment;
  }

  const previousStop = routeStops.value[index - 1] ?? null;
  return previousStop?.incomingSegment?.productType !== 'walk' ? previousStop?.incomingSegment ?? null : null;
};

const getTransitOutgoingSegment = (index: number): ConnectionSegment | null => {
  const stop = routeStops.value[index];

  if (!stop) {
    return null;
  }

  if (stop.outgoingSegment?.productType !== 'walk') {
    return stop.outgoingSegment;
  }

  const nextStop = routeStops.value[index + 1] ?? null;
  return nextStop?.outgoingSegment?.productType !== 'walk' ? nextStop?.outgoingSegment ?? null : null;
};

const getTransferAssessment = (index: number): ConnectionTransferAssessment | null => {
  if (!props.delayPrediction) {
    return null;
  }

  const incomingSegment = getTransitIncomingSegment(index);
  const outgoingSegment = getTransitOutgoingSegment(index);

  if (!incomingSegment || !outgoingSegment) {
    return null;
  }

  return props.delayPrediction.transferAssessments.find((assessment) => (
    assessment.incomingSegmentId === incomingSegment.id && assessment.outgoingSegmentId === outgoingSegment.id
  )) ?? null;
};

const getTransferTone = (successProbability: number | null): 'good' | 'warn' | 'bad' | 'neutral' => {
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

const getTransferFeasibilityLabel = (index: number): string | null => {
  const assessment = getTransferAssessment(index);
  const probability = formatProbability(assessment?.successProbability ?? null);

  if (!probability) {
    return null;
  }

  return t('views.dashboard.events.connection.transferPossibleShort', { value: probability });
};

const getPrimaryDelayCall = (index: number): ConnectionDelayCall | null => {
  if (!props.delayPrediction) {
    return null;
  }

  const stop = routeStops.value[index];

  if (!stop) {
    return null;
  }

  if (stop.kind === 'start' && stop.outgoingSegment) {
    return props.delayPrediction.calls.find((call) => call.key === `${stop.outgoingSegment?.id}-departure`) ?? null;
  }

  if (stop.kind === 'end' && stop.incomingSegment) {
    return props.delayPrediction.calls.find((call) => call.key === `${stop.incomingSegment?.id}-arrival`) ?? null;
  }

  return null;
};

const getPredictionProbability = (index: number): number | null => {
  const stop = routeStops.value[index];

  if (!stop) {
    return null;
  }

  if (stop.kind === 'stop') {
    return getTransferAssessment(index)?.successProbability ?? null;
  }

  return getPrimaryDelayCall(index)?.probabilityLate ?? null;
};

const getPredictionTone = (index: number): 'good' | 'warn' | 'bad' | 'neutral' => {
  const stop = routeStops.value[index];

  if (!stop) {
    return 'neutral';
  }

  if (stop.kind === 'stop') {
    return getTransferTone(getPredictionProbability(index));
  }

  const probability = getPredictionProbability(index);

  if (probability === null) {
    return 'neutral';
  }

  if (probability <= 0.2) {
    return 'good';
  }

  if (probability <= 0.5) {
    return 'warn';
  }

  return 'bad';
};

const getStopPredictionLabel = (index: number): string | null => {
  const stop = routeStops.value[index];
  const probability = formatProbability(getPredictionProbability(index));

  if (!stop || !probability) {
    return null;
  }

  if (stop.kind === 'start') {
    return t('views.dashboard.events.connection.departureProbabilityShort', { value: probability });
  }

  if (stop.kind === 'end') {
    return t('views.dashboard.events.connection.arrivalProbabilityShort', { value: probability });
  }

  return t('views.dashboard.events.connection.transferPossibleShort', { value: probability });
};

const getStopPredictionTitle = (index: number): string | null => {
  const stop = routeStops.value[index];

  if (!stop) {
    return null;
  }

  if (stop.kind === 'start') {
    return t('views.dashboard.events.connection.departureProbabilityLabel');
  }

  if (stop.kind === 'end') {
    return t('views.dashboard.events.connection.arrivalProbabilityLabel');
  }

  return t('views.dashboard.events.connection.transferPossibleLabel');
};

const getStopPredictionValue = (index: number): string | null => {
  return formatProbability(getPredictionProbability(index));
};

const getRelatedDelayCalls = (index: number): ConnectionDelayCall[] => {
  if (!props.delayPrediction) {
    return [];
  }

  const related: ConnectionDelayCall[] = [];
  const incomingSegment = getTransitIncomingSegment(index);
  const outgoingSegment = getTransitOutgoingSegment(index);

  if (incomingSegment) {
    const incomingCall = props.delayPrediction.calls.find((call) => call.key === `${incomingSegment.id}-arrival`) ?? null;

    if (incomingCall) {
      related.push(incomingCall);
    }
  }

  if (outgoingSegment) {
    const outgoingCall = props.delayPrediction.calls.find((call) => call.key === `${outgoingSegment.id}-departure`) ?? null;

    if (outgoingCall) {
      related.push(outgoingCall);
    }
  }

  return related;
};

const getDelayTone = (delayMinutes: number | null): 'good' | 'warn' | 'bad' | 'neutral' => {
  if (delayMinutes === null) {
    return 'neutral';
  }

  if (delayMinutes <= 0) {
    return 'good';
  }

  if (delayMinutes <= 5) {
    return 'warn';
  }

  return 'bad';
};

const getDelayBands = (call: ConnectionDelayCall): DelayBand[] => {
  const definitions = [
    {
      key: 'on-time',
      label: t('views.dashboard.events.connection.delayBandOnTime'),
      tone: 'good' as const,
      predicate: (delay: number) => delay <= 0,
    },
    {
      key: 'short',
      label: t('views.dashboard.events.connection.delayBandShort'),
      tone: 'warn' as const,
      predicate: (delay: number) => delay >= 1 && delay <= 2,
    },
    {
      key: 'medium',
      label: t('views.dashboard.events.connection.delayBandMedium'),
      tone: 'warn' as const,
      predicate: (delay: number) => delay >= 3 && delay <= 5,
    },
    {
      key: 'long',
      label: t('views.dashboard.events.connection.delayBandLong'),
      tone: 'bad' as const,
      predicate: (delay: number) => delay >= 6 && delay <= 10,
    },
    {
      key: 'severe',
      label: t('views.dashboard.events.connection.delayBandSevere'),
      tone: 'bad' as const,
      predicate: (delay: number) => delay >= 11,
    },
  ];

  return definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    tone: definition.tone,
    probability: call.distribution
      .filter((bucket) => definition.predicate(bucket.delayMinutes))
      .reduce((total, bucket) => total + bucket.probability, 0),
  }));
};

const shouldShowIncomingLine = (stop: RouteStopEntry): boolean => !(
  hasStationChange(stop) && stop.incomingSegment?.productType === 'walk'
);

const shouldShowOutgoingLine = (stop: RouteStopEntry): boolean => !(
  hasStationChange(stop) && stop.outgoingSegment?.productType === 'walk'
);

const getStationLink = (stopName: string, stopId?: string | null): string => buildStationInfoUrl(stopName, stopId);

const getStationProvider = (stopName: string, stopId?: string | null): string => (
  getStationInfoProviderLabel(stopName, stopId)
);
</script>

<template>
  <div v-if="routeStops.length > 0" class="connection-route">
    <div class="connection-route-overview">
      <strong class="connection-route-title">{{ title ?? t('views.dashboard.events.connection.route') }}</strong>
      <div class="connection-route-overview-times">
        <span>{{ t('views.dashboard.events.connection.departureLabel') }} {{ option.departureTime }}</span>
        <span>{{ t('views.dashboard.events.connection.arrivalLabel') }} {{ option.arrivalTime }}</span>
      </div>
    </div>

    <ol class="connection-route-list">
      <li
        v-for="(stop, index) in routeStops"
        :key="stop.key"
        class="connection-route-item"
        :class="{
          'connection-route-item--past': isPastStop(index),
          'connection-route-item--selected': isSelectedStop(index),
        }"
      >
        <div class="connection-route-track" aria-hidden="true">
          <span
            class="connection-route-rail connection-route-rail--top"
            :class="{
              'connection-route-rail--hidden': index === 0,
              'connection-route-rail--muted': isPastStop(index),
            }"
          ></span>
          <span
            class="connection-route-dot"
            :class="{ 'connection-route-dot--muted': isPastStop(index) }"
          >
            <span
              v-if="getStopMarkerEmoji(stop)"
              class="connection-route-dot-emoji"
              aria-hidden="true"
            >{{ getStopMarkerEmoji(stop) }}</span>
            <SvgIcon
              v-else-if="getStopMarkerIcon(stop)"
              class="connection-route-dot-icon"
              :icon="getStopMarkerIcon(stop) ?? 'products/BAHN'"
              :fallback-text="getStopMarkerFallbackLabel(stop)"
              :width="18"
              :height="18"
            />
          </span>
          <span
            class="connection-route-rail connection-route-rail--bottom"
            :class="{
              'connection-route-rail--hidden': index === routeStops.length - 1,
              'connection-route-rail--muted': selectedStopIndex !== null && index < selectedStopIndex,
            }"
          ></span>
        </div>
        <div class="connection-route-stop-shell">
          <button
            type="button"
            class="connection-route-stop-trigger"
            :aria-expanded="isSelectedStop(index)"
            @click="toggleStop(index)"
          >
            <span class="connection-route-stop-copy">
              <strong class="connection-route-stop-name">{{ stop.name }}</strong>
              <span class="connection-route-stop-meta">{{ getStopMeta(stop) }}</span>
            </span>
            <span class="connection-route-stop-side">
              <span
                v-if="getStopPredictionLabel(index)"
                class="connection-route-prediction-button"
                :class="`connection-route-prediction-button--${getPredictionTone(index)}`"
                @click.stop="toggleStop(index)"
              >
                {{ getStopPredictionLabel(index) }}
              </span>
              <span v-if="getOffsetLabel(stop)" class="connection-route-offset">{{ getOffsetLabel(stop) }}</span>
              <SvgIcon
                :icon="isSelectedStop(index) ? 'material/expand_less' : 'material/expand_more'"
                :dimension="20"
                aria-hidden="true"
              />
            </span>
          </button>

          <div v-if="isSelectedStop(index)" class="connection-route-stop-details">
            <div v-if="getStopAddress(stop)" class="connection-route-address-row">
              <span class="connection-route-detail-label">{{ t('views.dashboard.events.connection.addressLabel') }}</span>
              <span class="connection-route-detail-value">{{ getStopAddress(stop) }}</span>
            </div>

            <div class="connection-route-time-grid">
              <div v-if="stop.arrivalTime" class="connection-route-detail-row">
                <span class="connection-route-detail-label">{{ t('views.dashboard.events.connection.arrivalLabel') }}</span>
                <span class="connection-route-detail-value">{{ stop.arrivalTime }}</span>
              </div>
              <div v-if="stop.departureTime" class="connection-route-detail-row">
                <span class="connection-route-detail-label">{{ t('views.dashboard.events.connection.departureLabel') }}</span>
                <span class="connection-route-detail-value">{{ stop.departureTime }}</span>
              </div>
            </div>

            <div v-if="stop.incomingSegment && shouldShowIncomingLine(stop)" class="connection-route-lines">
              <span
                v-if="getConnectionProductEmoji(stop.incomingSegment.productType)"
                class="connection-route-line-emoji"
                aria-hidden="true"
              >{{ getConnectionProductEmoji(stop.incomingSegment.productType) }}</span>
              <SvgIcon
                v-else
                class="connection-route-line-icon"
                :icon="getConnectionProductIcon(stop.incomingSegment.productType) ?? 'products/BAHN'"
                :fallback-text="getConnectionProductFallbackLabel(stop.incomingSegment.productType)"
                :width="48"
                :height="22"
              />
              <strong>{{ formatConnectionServiceLabel(stop.incomingSegment) }}</strong>
              <span>{{ t('views.dashboard.events.connection.arrivalLabel') }} {{ stop.incomingSegment.arrivalTime }}</span>
            </div>

            <div v-if="stop.outgoingSegment && shouldShowOutgoingLine(stop)" class="connection-route-lines">
              <span
                v-if="getConnectionProductEmoji(stop.outgoingSegment.productType)"
                class="connection-route-line-emoji"
                aria-hidden="true"
              >{{ getConnectionProductEmoji(stop.outgoingSegment.productType) }}</span>
              <SvgIcon
                v-else
                class="connection-route-line-icon"
                :icon="getConnectionProductIcon(stop.outgoingSegment.productType) ?? 'products/BAHN'"
                :fallback-text="getConnectionProductFallbackLabel(stop.outgoingSegment.productType)"
                :width="48"
                :height="22"
              />
              <strong>{{ formatConnectionServiceLabel(stop.outgoingSegment) }}</strong>
              <span>{{ t('views.dashboard.events.connection.directionLabel', { stop: stop.outgoingSegment.toStop }) }}</span>
            </div>

            <div v-if="getTransferLabel(stop)" class="connection-route-transfer-card" :class="`connection-route-transfer-card--${getTransferTone(getTransferAssessment(index)?.successProbability ?? null)}`">
              <p class="connection-route-transfer">
                {{ getTransferLabel(stop) }}
              </p>
              <p v-if="hasStationChange(stop)" class="connection-route-transfer-summary">
                {{ t('views.dashboard.events.connection.transferWalkSummary', {
                  from: stop.incomingSegment?.toStop ?? stop.name,
                  to: stop.outgoingSegment?.productType === 'walk' ? stop.outgoingSegment.toStop : stop.outgoingSegment?.fromStop ?? stop.name,
                }) }}
              </p>
              <div class="connection-route-transfer-extras">
                <span v-if="hasStationChange(stop)" class="connection-route-transfer-chip">
                  🚶 {{ t('views.dashboard.events.connection.transferStationChange') }}
                </span>
                <span v-if="getTransferDistanceLabel(stop)" class="connection-route-transfer-chip">
                  📏 {{ t('views.dashboard.events.connection.transferDistance', { value: getTransferDistanceLabel(stop) }) }}
                </span>
                <span
                  v-if="getTransferFeasibilityLabel(index)"
                  class="connection-route-transfer-chip"
                  :class="`connection-route-transfer-chip--${getTransferTone(getTransferAssessment(index)?.successProbability ?? null)}`"
                >
                  {{ getTransferFeasibilityLabel(index) }}
                </span>
                <span v-if="formatProbability(getTransferAssessment(index)?.missedProbability ?? null)" class="connection-route-transfer-chip">
                  {{ t('views.dashboard.events.connection.transferMissedShort', { value: formatProbability(getTransferAssessment(index)?.missedProbability ?? null) }) }}
                </span>
                <a
                  v-if="getTransferRouteUrl(stop)"
                  class="connection-route-station-link"
                  :href="getTransferRouteUrl(stop) ?? undefined"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {{ t('views.dashboard.events.connection.debugTransferRouteLink') }}
                </a>
                <a
                  v-if="stop.incomingSegment"
                  class="connection-route-station-link"
                  :href="getStationLink(stop.incomingSegment.toStop, stop.incomingSegment.toStopId)"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {{ t('views.dashboard.events.connection.stationInfoLink', {
                    stop: stop.incomingSegment.toStop,
                    provider: getStationProvider(stop.incomingSegment.toStop, stop.incomingSegment.toStopId),
                  }) }}
                </a>
                <a
                  v-if="stop.outgoingSegment && stop.outgoingSegment.productType === 'walk'"
                  class="connection-route-station-link"
                  :href="getStationLink(stop.outgoingSegment.toStop, stop.outgoingSegment.toStopId)"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {{ t('views.dashboard.events.connection.stationInfoLink', {
                    stop: stop.outgoingSegment.toStop,
                    provider: getStationProvider(stop.outgoingSegment.toStop, stop.outgoingSegment.toStopId),
                  }) }}
                </a>
              </div>
            </div>

            <section v-if="getRelatedDelayCalls(index).length > 0 || getStopPredictionValue(index)" class="connection-route-delay-history">
              <strong class="connection-route-delay-title">{{ t('views.dashboard.events.connection.delayStopHistoryTitle') }}</strong>
              <p v-if="delayPrediction?.historyNote" class="connection-route-delay-note">
                {{ delayPrediction.historyNote }}
              </p>
              <div class="connection-route-time-grid">
                <div
                  v-if="getStopPredictionValue(index)"
                  class="connection-route-detail-row"
                  :class="`connection-route-detail-row--${getPredictionTone(index)}`"
                >
                  <span class="connection-route-detail-label">{{ getStopPredictionTitle(index) }}</span>
                  <span class="connection-route-detail-value">{{ getStopPredictionValue(index) }}</span>
                </div>
              </div>
              <div class="connection-route-delay-calls">
                <article
                  v-for="call in getRelatedDelayCalls(index)"
                  :key="call.key"
                  class="connection-route-delay-call"
                  :class="`connection-route-delay-call--${getDelayTone(call.expectedDelayMinutes)}`"
                >
                  <strong>{{ call.stopName }} · {{ call.eventType === 'departure' ? t('views.dashboard.events.connection.departureLabel') : t('views.dashboard.events.connection.arrivalLabel') }}</strong>
                  <span>{{ t('views.dashboard.events.connection.predictedDelayShort', { value: formatDelayMinutes(call.expectedDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}</span>
                  <span v-if="formatDelayMinutes(call.p50DelayMinutes)">{{ t('views.dashboard.events.connection.p50DelayShort', { value: formatDelayMinutes(call.p50DelayMinutes) }) }}</span>
                  <span v-if="formatDelayMinutes(call.p90DelayMinutes)">{{ t('views.dashboard.events.connection.p90DelayShort', { value: formatDelayMinutes(call.p90DelayMinutes) }) }}</span>
                  <span v-if="formatProbability(call.probabilityLate)">{{ t('views.dashboard.events.connection.probabilityLateShort', { value: formatProbability(call.probabilityLate) }) }}</span>
                  <div v-if="call.distribution.length > 0" class="connection-route-delay-scale">
                    <div
                      v-for="band in getDelayBands(call)"
                      :key="`${call.key}-${band.key}`"
                      class="connection-route-delay-band"
                    >
                      <span class="connection-route-delay-band-label">{{ band.label }}</span>
                      <span class="connection-route-delay-band-track">
                        <span class="connection-route-delay-band-fill" :class="`connection-route-delay-band-fill--${band.tone}`" :style="{ width: `${Math.round(band.probability * 100)}%` }"></span>
                      </span>
                      <span class="connection-route-delay-band-value">{{ formatProbability(band.probability) ?? formatProbability(0) }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section
              v-if="hasStopMobilityHubData(stop) && getStopMobilityHubGroup(stop)"
              class="connection-route-mobility"
            >
              <div
                v-for="category in getSharingCategories(stop)"
                :key="`sharing-${stop.key}-${category.id}`"
                class="connection-route-mobility-subsection"
              >
                <strong class="connection-route-mobility-subtitle">
                  <SvgIcon :icon="category.icon" :dimension="14" aria-hidden="true" />
                  {{ category.title }}
                </strong>
                <article
                  v-for="station in getVisibleItems(category.stations, getMobilityMoreKey(stop, 'sharing', category.id))"
                  :key="station.stationId ?? `${stop.key}-${station.name}-${station.lat}-${station.lon}`"
                  class="connection-route-mobility-item"
                >
                  <strong>{{ station.name }}</strong>
                  <p>{{ t('views.dashboard.events.connection.mobility.operator', { value: normalizeOperatorLabel(station.operator) }) }}</p>
                  <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getSharingDistanceLabel(stop, station) }) }}</p>
                  <p v-if="station.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', { value: station.capacity }) }}</p>
                  <ul v-if="station.realtimeAvailability.length > 0" class="connection-route-mobility-list">
                    <li v-for="availability in station.realtimeAvailability" :key="`${station.stationId ?? station.name}-${availability.key}`">
                      {{ t('views.dashboard.events.connection.mobility.realtimeCapacity', { mode: availability.mode, value: availability.value }) }}
                    </li>
                  </ul>
                </article>
                <button
                  v-if="category.stations.length > 3"
                  type="button"
                  class="connection-route-mobility-more-button"
                  @click="toggleMobilityExpanded(getMobilityMoreKey(stop, 'sharing', category.id))"
                >
                  {{
                    isMobilityExpanded(getMobilityMoreKey(stop, 'sharing', category.id))
                      ? t('views.dashboard.events.connection.mobility.showLess')
                      : t('views.dashboard.events.connection.mobility.more')
                  }}
                </button>
              </div>

              <div
                v-for="category in getParkingCategories(stop)"
                :key="`parking-${stop.key}-${category.id}`"
                class="connection-route-mobility-subsection"
              >
                <strong class="connection-route-mobility-subtitle">
                  <span class="connection-route-mobility-parking-icon" aria-hidden="true">P</span>
                  {{ category.title }}
                </strong>
                <article
                  v-for="site in getVisibleItems(category.sites, getMobilityMoreKey(stop, 'parking', category.id))"
                  :key="site.id ?? `${stop.key}-${site.name}-${site.lat}-${site.lon}`"
                  class="connection-route-mobility-item"
                >
                  <strong>{{ site.name }}</strong>
                  <p>{{ t('views.dashboard.events.connection.mobility.purpose', { value: getPurposeLabel(site.purpose) }) }}</p>
                  <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getParkingDistanceLabel(stop, site) }) }}</p>
                  <p v-if="site.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', { value: site.capacity }) }}</p>
                  <p v-if="site.realtimeFreeCapacity !== null">{{ t('views.dashboard.events.connection.mobility.freeCapacity', { value: site.realtimeFreeCapacity }) }}</p>
                  <img
                    v-if="site.photoUrl"
                    class="connection-route-mobility-photo"
                    :src="site.photoUrl"
                    :alt="t('views.dashboard.events.connection.mobility.photoAlt', { name: site.name })"
                    loading="lazy"
                  >
                </article>
                <button
                  v-if="category.sites.length > 3"
                  type="button"
                  class="connection-route-mobility-more-button"
                  @click="toggleMobilityExpanded(getMobilityMoreKey(stop, 'parking', category.id))"
                >
                  {{
                    isMobilityExpanded(getMobilityMoreKey(stop, 'parking', category.id))
                      ? t('views.dashboard.events.connection.mobility.showLess')
                      : t('views.dashboard.events.connection.mobility.more')
                  }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.connection-route {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.connection-route-overview {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}

.connection-route-overview-times {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #52525b;
  font-size: 0.82rem;
}

.connection-route-title {
  font-size: 0.92rem;
  color: #7f1d1d;
}

.connection-route-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.connection-route-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}

.connection-route-item--past {
  opacity: 0.58;
}

.connection-route-track {
  display: grid;
  grid-template-rows: 10px 24px minmax(18px, 1fr);
  justify-items: center;
}

.connection-route-rail {
  width: 4px;
  border-radius: 999px;
  background: #be123c;
}

.connection-route-rail--hidden {
  visibility: hidden;
}

.connection-route-rail--muted {
  background: rgba(161, 161, 170, 0.9);
}

.connection-route-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 999px;
  background: #ffffff;
  border: 3px solid #be123c;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.connection-route-dot--muted {
  border-color: rgba(161, 161, 170, 0.9);
}

.connection-route-dot-icon {
  width: 18px;
  height: 18px;
}

.connection-route-dot-emoji {
  font-size: 0.82rem;
  line-height: 1;
}

.connection-route-stop-shell {
  min-width: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.connection-route-stop-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #27272a;
  text-align: left;
  cursor: pointer;
}

.connection-route-stop-copy,
.connection-route-stop-side,
.connection-route-stop-details {
  min-width: 0;
}

.connection-route-stop-copy {
  display: grid;
  gap: 4px;
}

.connection-route-stop-side {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.connection-route-stop-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
}

.connection-route-stop-meta {
  font-size: 0.8rem;
  color: #6b7280;
}

.connection-route-offset,
.connection-route-prediction-button {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
}

.connection-route-offset {
  background: rgba(15, 23, 42, 0.06);
}

.connection-route-prediction-button {
  cursor: pointer;
}

.connection-route-prediction-button--good {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.connection-route-prediction-button--warn {
  background: rgba(254, 243, 199, 0.95);
  color: #92400e;
}

.connection-route-prediction-button--bad {
  background: rgba(254, 226, 226, 0.95);
  color: #b91c1c;
}

.connection-route-prediction-button--neutral {
  background: rgba(226, 232, 240, 0.92);
  color: #475569;
}

.connection-route-stop-details {
  display: grid;
  gap: 10px;
  padding: 10px 8px 4px 0;
  min-width: 0;
}

.connection-route-address-row,
.connection-route-mobility,
.connection-route-transfer-card,
.connection-route-delay-history {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.connection-route-transfer-card {
  border: 1px dashed rgba(148, 163, 184, 0.45);
}

.connection-route-transfer-card--good {
  border-color: rgba(34, 197, 94, 0.35);
}

.connection-route-transfer-card--warn {
  border-color: rgba(245, 158, 11, 0.4);
}

.connection-route-transfer-card--bad {
  border-color: rgba(239, 68, 68, 0.4);
}

.connection-route-time-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.connection-route-mobility-subsection {
  display: grid;
  gap: 8px;
}

.connection-route-mobility-subtitle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #334155;
  font-size: 0.82rem;
}

.connection-route-mobility-parking-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #2563eb;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
}

.connection-route-mobility-item {
  display: grid;
  gap: 4px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  min-width: 0;
}

.connection-route-mobility-item p {
  margin: 0;
  color: #334155;
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.connection-route-mobility-item strong {
  overflow-wrap: anywhere;
}

.connection-route-mobility-list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  font-size: 0.82rem;
}

.connection-route-mobility-photo {
  width: 100%;
  max-width: 240px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  margin-top: 4px;
}

.connection-route-mobility-more-button {
  justify-self: start;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.connection-route-detail-value {
  overflow-wrap: anywhere;
}

.connection-route-detail-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #3f3f46;
  font-size: 0.84rem;
}

.connection-route-detail-label {
  font-weight: 700;
}

.connection-route-lines {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #27272a;
  font-size: 0.9rem;
}

.connection-route-line-icon {
  flex: 0 0 auto;
}

.connection-route-line-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 1rem;
}

.connection-route-transfer,
.connection-route-transfer-summary,
.connection-route-delay-note {
  margin: 0;
  color: #52525b;
  font-size: 0.84rem;
}

.connection-route-transfer {
  font-weight: 600;
}

.connection-route-transfer-extras,
.connection-route-delay-calls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.connection-route-delay-calls {
  display: grid;
}

.connection-route-delay-title {
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
}

.connection-route-delay-call {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  color: #475569;
  font-size: 0.8rem;
}

.connection-route-delay-call--good {
  border: 1px solid rgba(34, 197, 94, 0.22);
}

.connection-route-delay-call--warn {
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.connection-route-delay-call--bad {
  border: 1px solid rgba(239, 68, 68, 0.22);
}

.connection-route-delay-call--neutral {
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.connection-route-delay-scale {
  display: grid;
  gap: 6px;
  width: 100%;
}

.connection-route-delay-band {
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.connection-route-delay-band-label,
.connection-route-delay-band-value {
  font-size: 0.74rem;
  color: #475569;
}

.connection-route-delay-band-track {
  display: block;
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.92);
}

.connection-route-delay-band-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.connection-route-delay-band-fill--good {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.92), rgba(22, 163, 74, 0.92));
}

.connection-route-delay-band-fill--warn {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.96), rgba(245, 158, 11, 0.96));
}

.connection-route-delay-band-fill--bad {
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.96), rgba(239, 68, 68, 0.96));
}

.connection-route-transfer-chip,
.connection-route-station-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.connection-route-transfer-chip {
  background: rgba(255, 247, 237, 0.96);
  color: #9a3412;
}

.connection-route-transfer-chip--good {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.connection-route-transfer-chip--warn {
  background: rgba(254, 243, 199, 0.95);
  color: #92400e;
}

.connection-route-transfer-chip--bad {
  background: rgba(254, 226, 226, 0.95);
  color: #b91c1c;
}

.connection-route-station-link {
  color: #7c2d12;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(249, 115, 22, 0.2);
  text-decoration: none;
}

@media (max-width: 720px) {
  .connection-route-overview,
  .connection-route-stop-trigger {
    flex-direction: column;
    align-items: flex-start;
  }

  .connection-route-stop-side {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
