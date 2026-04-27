import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  formatDelayMinutes,
  formatProbability,
} from '@/components/connection/connection-utils';
import type { ConnectionDelayCall } from '@/features/motis/routing-service.d';
import type {
  DelayBand,
  DelayPredictionCardProps,
  DelayPredictionCardTone,
} from './DelayPredictionCard.d';

const getDelayTone = (delayMinutes: number | null): DelayPredictionCardTone => {
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

export const useDelayPredictionCard = (props: DelayPredictionCardProps) => {
  const { t } = useI18n();

  const hasContent = computed(() => props.relatedDelayCalls.length > 0 || Boolean(props.stopPredictionValue));

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

  return {
    formatDelayMinutes,
    formatProbability,
    getDelayBands,
    getDelayTone,
    hasContent,
    t,
  };
};
