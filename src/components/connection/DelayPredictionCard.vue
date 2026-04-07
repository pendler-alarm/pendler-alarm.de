<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  formatDelayMinutes,
  formatProbability,
} from '@/components/connection/connection-utils';
import type {
  ConnectionDelayCall,
  ConnectionDelayPrediction,
} from '@/features/motis/routing-service';

const props = defineProps<{
  prediction: ConnectionDelayPrediction;
}>();

const { t } = useI18n();

type DelayBand = {
  key: string;
  label: string;
  probability: number;
  tone: 'good' | 'warn' | 'bad';
};

const visibleCalls = computed(() => props.prediction.calls.filter((call) => call.distribution.length > 0));

const getCallTone = (expectedDelayMinutes: number | null): string => {
  const expected = expectedDelayMinutes ?? 0;

  if (expected <= 0) {
    return 'good';
  }

  if (expected <= 5) {
    return 'warn';
  }

  return 'bad';
};

const departureTone = computed(() => getCallTone(props.prediction.expectedDepartureDelayMinutes));
const arrivalTone = computed(() => getCallTone(props.prediction.expectedArrivalDelayMinutes));

const formatClock = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(new Date(value));
};

const getBands = (call: ConnectionDelayCall): DelayBand[] => {
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
</script>

<template>
  <section class="delay-card">
    <div class="delay-header">
      <div>
        <span class="delay-pill">⏱️ {{ t('views.dashboard.events.connection.delayTitle') }}</span>
        <strong class="delay-title">{{ t('views.dashboard.events.connection.delaySubtitle') }}</strong>
      </div>
      <div class="delay-summary">
        <span class="delay-chip" :class="`delay-chip--${departureTone}`">
          {{ t('views.dashboard.events.connection.predictedDepartureDelay', { value: formatDelayMinutes(prediction.expectedDepartureDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}
        </span>
        <span class="delay-chip" :class="`delay-chip--${arrivalTone}`">
          {{ t('views.dashboard.events.connection.predictedArrivalDelay', { value: formatDelayMinutes(prediction.expectedArrivalDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}
        </span>
        <span v-if="formatDelayMinutes(prediction.p50ArrivalDelayMinutes)" class="delay-chip delay-chip--neutral">
          {{ t('views.dashboard.events.connection.p50Delay', { value: formatDelayMinutes(prediction.p50ArrivalDelayMinutes) }) }}
        </span>
        <span v-if="formatDelayMinutes(prediction.p90ArrivalDelayMinutes)" class="delay-chip delay-chip--neutral">
          {{ t('views.dashboard.events.connection.p90Delay', { value: formatDelayMinutes(prediction.p90ArrivalDelayMinutes) }) }}
        </span>
        <span v-if="formatProbability(prediction.probabilityArrivalLate)" class="delay-chip delay-chip--neutral">
          {{ t('views.dashboard.events.connection.probabilityLate', { value: formatProbability(prediction.probabilityArrivalLate) }) }}
        </span>
      </div>
    </div>

    <section v-if="prediction.historyAvailable" class="delay-average-card">
      <strong class="delay-average-title">{{ t('views.dashboard.events.connection.delayAverageTitle') }}</strong>
      <div class="delay-average-grid">
        <span class="delay-chip" :class="`delay-chip--${departureTone}`">
          {{ t('views.dashboard.events.connection.delayAverageDeparture', { value: formatDelayMinutes(prediction.expectedDepartureDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}
        </span>
        <span class="delay-chip" :class="`delay-chip--${arrivalTone}`">
          {{ t('views.dashboard.events.connection.delayAverageArrival', { value: formatDelayMinutes(prediction.expectedArrivalDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}
        </span>
      </div>
      <p v-if="prediction.historyNote" class="delay-note">
        {{ prediction.historyNote }}
      </p>
    </section>

    <div class="delay-call-list">
      <article v-for="call in visibleCalls" :key="call.key" class="delay-call" :class="`delay-call--${getCallTone(call.expectedDelayMinutes)}`">
        <div class="delay-call-top">
          <strong>{{ call.stopName }}</strong>
          <span>{{ call.serviceLabel }}</span>
        </div>
        <div class="delay-call-meta">
          <span>{{ call.eventType === 'departure' ? t('views.dashboard.events.connection.departureLabel') : t('views.dashboard.events.connection.arrivalLabel') }}</span>
          <span>{{ t('views.dashboard.events.connection.predictedDelayShort', { value: formatDelayMinutes(call.expectedDelayMinutes) ?? t('calendar.connection.timeUnknown') }) }}</span>
          <span v-if="formatDelayMinutes(call.p50DelayMinutes)">{{ t('views.dashboard.events.connection.p50DelayShort', { value: formatDelayMinutes(call.p50DelayMinutes) }) }}</span>
          <span v-if="formatDelayMinutes(call.p90DelayMinutes)">{{ t('views.dashboard.events.connection.p90DelayShort', { value: formatDelayMinutes(call.p90DelayMinutes) }) }}</span>
          <span v-if="formatProbability(call.probabilityLate)">{{ t('views.dashboard.events.connection.probabilityLateShort', { value: formatProbability(call.probabilityLate) }) }}</span>
        </div>
        <div class="delay-call-time-row">
          <span>{{ t('views.dashboard.events.connection.scheduledTime', { value: formatClock(call.plannedIso) ?? t('calendar.connection.timeUnknown') }) }}</span>
          <span v-if="formatClock(call.likelyIso)">{{ t('views.dashboard.events.connection.likelyTime', { value: formatClock(call.likelyIso) }) }}</span>
        </div>
        <div class="delay-scale" role="img" :aria-label="t('views.dashboard.events.connection.delayScaleLabel', { stop: call.stopName })">
          <div
            v-for="band in getBands(call)"
            :key="`${call.key}-${band.key}`"
            class="delay-band"
          >
            <span class="delay-band-label">{{ band.label }}</span>
            <span class="delay-band-track">
              <span class="delay-band-fill" :class="`delay-band-fill--${band.tone}`" :style="{ width: `${Math.round(band.probability * 100)}%` }"></span>
            </span>
            <span class="delay-band-value">{{ formatProbability(band.probability) ?? formatProbability(0) }}</span>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!prediction.historyAvailable && prediction.historyNote" class="delay-note">
      {{ prediction.historyNote }}
    </p>
  </section>
</template>

<style scoped>
.delay-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.94));
}

.delay-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.delay-pill,
.delay-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.delay-pill {
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.85);
}

.delay-title {
  display: block;
  color: #0f172a;
}

.delay-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.delay-chip--good {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.delay-chip--warn {
  background: rgba(254, 243, 199, 0.96);
  color: #92400e;
}

.delay-chip--bad {
  background: rgba(254, 226, 226, 0.96);
  color: #b91c1c;
}

.delay-chip--neutral {
  background: rgba(226, 232, 240, 0.9);
  color: #334155;
}

.delay-average-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.delay-average-title {
  color: #0f172a;
  font-size: 0.9rem;
}

.delay-average-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.delay-call-list {
  display: grid;
  gap: 10px;
}

.delay-call {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.delay-call--good {
  border-color: rgba(34, 197, 94, 0.22);
}

.delay-call--warn {
  border-color: rgba(245, 158, 11, 0.22);
}

.delay-call--bad {
  border-color: rgba(239, 68, 68, 0.22);
}

.delay-call-top,
.delay-call-meta,
.delay-call-time-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.delay-call-top strong {
  color: #0f172a;
}

.delay-call-top span,
.delay-call-meta span,
.delay-call-time-row span,
.delay-note,
.delay-band-label,
.delay-band-value {
  color: #475569;
  font-size: 0.84rem;
}


.delay-scale {
  display: grid;
  gap: 6px;
}

.delay-band {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 52px;
  gap: 8px;
  align-items: center;
}

.delay-band-track {
  display: block;
  height: 9px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.85);
  overflow: hidden;
}

.delay-band-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.delay-band-fill--good {
  background: #22c55e;
}

.delay-band-fill--warn {
  background: #f59e0b;
}

.delay-band-fill--bad {
  background: #ef4444;
}

.delay-note {
  margin: 0;
}

@media (max-width: 720px) {
  .delay-header {
    flex-direction: column;
  }

  .delay-summary {
    justify-content: flex-start;
  }

  .delay-band {
    grid-template-columns: 1fr;
  }
}
</style>
