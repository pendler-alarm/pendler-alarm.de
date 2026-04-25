export type ConnectionStatus = 'on_time' | 'delayed';

export type ConnectionProductType =
  | 'regio'
  | 'sbahn'
  | 'ubahn'
  | 'bus'
  | 'tram'
  | 'train'
  | 'ice'
  | 'ic'
  | 'flight'
  | 'ferry'
  | 'walk';

export type ConnectionSegment = {
  id: string;
  productType: ConnectionProductType;
  productLabel: string;
  lineLabel: string;
  fromStop: string;
  fromStopId: string | null;
  fromCoordinates: Coordinates | null;
  toStop: string;
  toStopId: string | null;
  toCoordinates: Coordinates | null;
  departureIso: string | null;
  departureTime: string;
  arrivalIso: string | null;
  arrivalTime: string;
};

export type ConnectionDelayDistributionBucket = {
  delayMinutes: number;
  probability: number;
};

export type ConnectionDelayCall = {
  key: string;
  stopName: string;
  stopId: string | null;
  serviceLabel: string;
  eventType: 'departure' | 'arrival';
  plannedIso: string | null;
  likelyIso: string | null;
  expectedDelayMinutes: number | null;
  mostLikelyDelayMinutes: number | null;
  p50DelayMinutes: number | null;
  p90DelayMinutes: number | null;
  probabilityLate: number | null;
  distribution: ConnectionDelayDistributionBucket[];
};

export type ConnectionTransferAssessment = {
  key: string;
  fromStopName: string;
  toStopName: string;
  incomingSegmentId: string;
  outgoingSegmentId: string;
  transferMinutes: number | null;
  successProbability: number | null;
  missedProbability: number | null;
  arrivalExpectedDelayMinutes: number | null;
  arrivalP50DelayMinutes: number | null;
  arrivalP90DelayMinutes: number | null;
  departureExpectedDelayMinutes: number | null;
  departureP50DelayMinutes: number | null;
  departureP90DelayMinutes: number | null;
};
export type $ConnectionTransferAssessment = ConnectionTransferAssessment | null | undefined;

export type MobilityHubSharingStation = {
  stationId: string | null;
  name: string;
  operator: string | null;
  capacity: number | null;
  lat: number;
  lon: number;
  lastReported: string | null;
  realtimeAvailability: Array<{
    key: string;
    mode: string;
    value: number;
  }>;
};

export type MobilityHubParkingSite = {
  id: string | null;
  name: string;
  purpose: string | null;
  capacity: number | null;
  type: string | null;
  lat: number;
  lon: number;
  modifiedAt: string | null;
  photoUrl: string | null;
  realtimeFreeCapacity: number | null;
};

export type ConnectionMobilityHubGroup = {
  lat: number;
  lon: number;
  parkingSites: MobilityHubParkingSite[];
  sharingStations: MobilityHubSharingStation[];
};

export type ConnectionDelayPrediction = {
  likelyConnection: ConnectionOption | null;
  expectedDepartureDelayMinutes: number | null;
  expectedArrivalDelayMinutes: number | null;
  p50DepartureDelayMinutes: number | null;
  p50ArrivalDelayMinutes: number | null;
  p90DepartureDelayMinutes: number | null;
  p90ArrivalDelayMinutes: number | null;
  probabilityArrivalLate: number | null;
  calls: ConnectionDelayCall[];
  transferAssessments: ConnectionTransferAssessment[];
  mobilityHubRadiusMeters: number | null;
  originMobilityHubs: ConnectionMobilityHubGroup | null;
  destinationMobilityHubs: ConnectionMobilityHubGroup | null;
  historyAvailable: boolean;
  historyNote: string | null;
};

export type ConnectionOption = {
  departureIso: string | null;
  departureTime: string;
  arrivalIso: string | null;
  arrivalTime: string;
  fromStop: string;
  toStop: string;
  durationMinutes: number | null;
  transferCount: number;
  transportModes: string[];
  segments: ConnectionSegment[];
  status: ConnectionStatus;
  delayPrediction?: ConnectionDelayPrediction | null;
};

export type ConnectionSummary = ConnectionOption & {
  alternatives: ConnectionOption[];
  requestedBufferMinutes: number;
  effectiveBufferMinutes: number;
  minimumBufferMinutes: number;
};

export type FetchConnectionOptions = {
  time?: string;
  latestArrivalIso?: string;
  arriveBy?: boolean;
  maxConnections?: number;
  searchWindowMinutes?: number;
  showTransferWalkNodes?: boolean;
};

export type MotisPlace = {
  stopId?: string;
  name?: string;
  lat?: number;
  lon?: number;
  level?: number;
  departure?: string;
  arrival?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
};

export type MotisLeg = {
  mode?: string;
  from?: MotisPlace;
  to?: MotisPlace;
  departure?: string;
  arrival?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  duration?: number;
  realTime?: boolean;
  cancelled?: boolean;
  tripCancelled?: boolean;
  routeShortName?: string;
  tripShortName?: string;
  displayName?: string;
  headsign?: string;
  steps?: Array<{
    distance?: number;
    relativeDirection?: string;
    streetName?: string;
  }>;
};

export type MotisItinerary = {
  legs?: MotisLeg[];
  transfers?: number;
  departure?: string;
  arrival?: string;
  startTime?: string;
  endTime?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
};

export type MotisPlanResponse =
  | MotisItinerary[]
  | {
    itineraries?: MotisItinerary[];
    direct?: MotisItinerary[];
  };

  export type $ConnectionSegment = ConnectionSegment | null | undefined;