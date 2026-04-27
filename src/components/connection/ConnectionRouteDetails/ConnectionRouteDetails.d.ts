import type {
  ConnectionDelayPrediction,
  ConnectionOption,
} from '@/features/motis/routing-service';

export type ConnectionRouteDetailsProps = {
  option: ConnectionOption;
  title?: string;
  delayPrediction?: ConnectionDelayPrediction | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
};
