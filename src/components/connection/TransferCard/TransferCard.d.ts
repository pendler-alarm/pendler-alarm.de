import type { ChipLink } from '@/components/Chip/Chip.d';

export type TransferCardTone = 'good' | 'warn' | 'bad' | 'neutral';

export type TransferCardProps = {
  hasStationChange?: boolean;
  incomingStationLink?: ChipLink | null;
  missedProbabilityLabel?: string | null;
  outgoingWalkStationLink?: ChipLink | null;
  transferDistanceLabel?: string | null;
  transferFeasibilityLabel?: string | null;
  transferLabel?: string | null;
  transferRouteLink?: ChipLink | null;
  transferStationChangeLabel?: string | null;
  transferTone: TransferCardTone;
  transferWalkSummary?: string | null;
};
