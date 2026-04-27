import type { ConnectionSummary } from '@/features/motis/routing-service.d';
import type { SharingSuggestion } from '@/features/sharing/sharing-service';

export type ConnectionCardProps = {
  connection: ConnectionSummary;
  eventId?: string;
  eventStartIso?: string | null;
  lastUpdatedIso?: string | null;
  sharingSuggestion?: SharingSuggestion | null;
  deutschlandticketEnabled?: boolean;
  bahnBookingClass?: '1' | '2';
  bahnTravelerProfileParam?: string;
  originAddress?: string | null;
  destinationAddress?: string | null;
};
