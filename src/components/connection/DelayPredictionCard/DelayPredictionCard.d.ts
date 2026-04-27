import type { ConnectionDelayCall } from '@/features/motis/routing-service';

export type DelayPredictionCardTone = 'good' | 'warn' | 'bad' | 'neutral';

export type DelayBand = {
  key: string;
  label: string;
  probability: number;
  tone: Exclude<DelayPredictionCardTone, 'neutral'>;
};

export type DelayPredictionCardProps = {
  delayNote?: string | null;
  predictionTone: DelayPredictionCardTone;
  relatedDelayCalls: ConnectionDelayCall[];
  stopPredictionTitle?: string | null;
  stopPredictionValue?: string | null;
};
