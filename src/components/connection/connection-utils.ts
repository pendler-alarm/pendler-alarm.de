import { translate } from '@/i18n';
import type {
  ConnectionOption,
  ConnectionProductType,
  ConnectionSegment,
} from '@/features/motis/routing-service';

export const formatConnectionDuration = (durationMinutes: number | null): string => {
  if (durationMinutes === null) {
    return translate('calendar.connection.timeUnknown');
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};

export const getConnectionLeadMinutes = (
  eventStartIso: string | null,
  connection: ConnectionOption | null | undefined,
): number | null => {
  if (!eventStartIso || !connection?.arrivalIso) {
    return null;
  }

  const diffMs = new Date(eventStartIso).getTime() - new Date(connection.arrivalIso).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

export const getConnectionLeadLabel = (
  eventStartIso: string | null,
  connection: ConnectionOption | null | undefined,
): string | null => {
  const leadMinutes = getConnectionLeadMinutes(eventStartIso, connection);

  if (leadMinutes === null) {
    return null;
  }

  if (leadMinutes < 0) {
    return translate('views.dashboard.events.connection.arrivesTooLate', { count: Math.abs(leadMinutes) });
  }

  return translate('views.dashboard.events.connection.buffer', { count: leadMinutes });
};

export const getConnectionProductIcon = (type: ConnectionProductType): string | null => {
  switch (type) {
    case 'regio':
      return 'products/BAHN';
    case 'sbahn':
      return 'products/SBAHN';
    case 'ubahn':
      return 'products/UBAHN';
    case 'ferry':
      return 'products/FERRY';
    case 'bus':
      return 'products/BUS';
    case 'tram':
      return 'products/TRAM';
    case 'train':
      return 'products/BAHN';
    default:
      return null;
  }
};

export const getConnectionProductFallbackLabel = (type: ConnectionProductType): string => {
  switch (type) {
    case 'regio':
      return 'RE';
    case 'sbahn':
      return 'S';
    case 'ubahn':
      return 'U';
    case 'bus':
      return 'Bus';
    case 'tram':
      return 'Tram';
    case 'ferry':
      return 'Fähre';
    case 'walk':
      return '🚶';
    default:
      return 'Bahn';
  }
};

export const getConnectionProductEmoji = (
  type: ConnectionProductType,
  options?: { isDestination?: boolean },
): string | null => {
  if (options?.isDestination) {
    return '🎯';
  }

  if (type === 'walk') {
    return '🚶';
  }

  return null;
};

export const formatConnectionServiceLabel = (segment: ConnectionSegment): string => {
  const lineLabel = segment.lineLabel.trim();
  const productLabel = segment.productLabel.trim();

  if (lineLabel.toLowerCase().includes(productLabel.toLowerCase())) {
    return lineLabel;
  }

  return `${productLabel} ${lineLabel}`;
};
