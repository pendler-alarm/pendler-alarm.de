import type { ConnectionSegment } from '@/features/motis/routing-service';
import type {
  ConnectionDelayCall,
  ConnectionDelayPrediction,
  ConnectionTransferAssessment,
} from '@/features/motis/routing-service';

export type RouteStopEntry = {
  key: string;
  kind: 'start' | 'stop' | 'end';
  name: string;
  minuteOffset: number | null;
  arrivalTime: string | null;
  departureTime: string | null;
  incomingSegment: ConnectionSegment | null;
  outgoingSegment: ConnectionSegment | null;
};

export type $RouteStopEntry = RouteStopEntry | undefined;

export type DetailTone = 'good' | 'warn' | 'bad' | 'neutral';

export type ConnectionRouteDetailProps = {
  stop: RouteStopEntry;
  delayPrediction?: ConnectionDelayPrediction | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
  predictionTone: DetailTone;
  stopPredictionTitle?: string | null;
  stopPredictionValue?: string | null;
  relatedDelayCalls: ConnectionDelayCall[];
  transferAssessment?: ConnectionTransferAssessment | null;
};
