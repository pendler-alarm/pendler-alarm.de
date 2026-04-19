<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SharingSuggestion } from '@/features/sharing/sharing-service';
import { formatConnectionDuration } from '@/components/connection/connection-utils';

const props = defineProps<{
  suggestion: SharingSuggestion;
  targetLabel?: string;
  hideDestinationWalk?: boolean;
}>();

const { t } = useI18n();
const averageWalkMetersPerMinute = 80;
const averageBikeMetersPerMinute = 250;

type SharingStep = {
  key: string;
  emoji: string;
  title: string;
  detail: string;
  durationLabel: string;
};

const estimateMinutes = (meters: number, paceMetersPerMinute: number): number =>
  Math.max(1, Math.round(meters / paceMetersPerMinute));

const journeyTargetLabel = computed(() =>
  props.targetLabel?.trim()
  || props.suggestion.destinationStation?.name
  || t('views.dashboard.events.sharing.timeline.destinationOpen'),
);

const steps = computed<SharingStep[]>(() => {
  const nextSteps: SharingStep[] = [];

  if (props.suggestion.originStation) {
    nextSteps.push({
      key: 'walk-to-bike',
      emoji: '🚶',
      title: t('views.dashboard.events.sharing.timeline.walkToBike'),
      detail: props.suggestion.originStation.name,
      durationLabel: formatConnectionDuration(estimateMinutes(props.suggestion.originStation.distanceMeters, averageWalkMetersPerMinute)),
    });
  }

  nextSteps.push({
    key: 'bike-ride',
    emoji: '🚲',
    title: t('views.dashboard.events.sharing.timeline.ride'),
    detail: journeyTargetLabel.value,
    durationLabel: formatConnectionDuration(estimateMinutes(props.suggestion.tripDistanceMeters, averageBikeMetersPerMinute)),
  });

  if (props.suggestion.destinationStation && !props.hideDestinationWalk) {
    nextSteps.push({
      key: 'walk-to-destination',
      emoji: '🚶',
      title: t('views.dashboard.events.sharing.timeline.walkToDestination'),
      detail: journeyTargetLabel.value,
      durationLabel: formatConnectionDuration(estimateMinutes(props.suggestion.destinationStation.distanceMeters, averageWalkMetersPerMinute)),
    });
  }

  return nextSteps;
});
</script>

<template>
  <div class="sharing-journey">
    <div class="sharing-journey-header">
      <strong>{{ t('views.dashboard.events.sharing.timeline.title') }}</strong>
      <span>{{ t('views.dashboard.events.sharing.estimatedDuration', { value: steps.map((step) => step.durationLabel).join(' · ') }) }}</span>
    </div>

    <ol class="sharing-journey-list">
      <li v-for="(step, index) in steps" :key="step.key" class="sharing-journey-item">
        <div class="sharing-journey-track" aria-hidden="true">
          <span class="sharing-journey-rail" :class="{ 'sharing-journey-rail--hidden': index === 0 }"></span>
          <span class="sharing-journey-dot">{{ step.emoji }}</span>
          <span class="sharing-journey-rail" :class="{ 'sharing-journey-rail--hidden': index === steps.length - 1 }"></span>
        </div>
        <div class="sharing-journey-copy">
          <div class="sharing-journey-row">
            <strong>{{ step.title }}</strong>
            <span class="sharing-journey-duration">{{ step.durationLabel }}</span>
          </div>
          <span class="sharing-journey-detail">{{ step.detail }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.sharing-journey {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
}

.sharing-journey-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.84rem;
  color: #4b5563;
}

.sharing-journey-header strong {
  color: #111827;
}

.sharing-journey-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sharing-journey-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
}

.sharing-journey-track {
  display: grid;
  grid-template-rows: 10px 28px minmax(10px, 1fr);
  justify-items: center;
}

.sharing-journey-rail {
  width: 4px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.6);
}

.sharing-journey-rail--hidden {
  visibility: hidden;
}

.sharing-journey-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
  font-size: 0.85rem;
}

.sharing-journey-copy {
  display: grid;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.sharing-journey-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sharing-journey-duration {
  color: #4b5563;
  font-size: 0.82rem;
  font-weight: 700;
}

.sharing-journey-detail {
  color: #6b7280;
  font-size: 0.82rem;
}

@media (max-width: 720px) {
  .sharing-journey-row,
  .sharing-journey-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
