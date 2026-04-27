<script setup lang="ts">
import Item from '@/components/Item/Item.vue';
import Card from '@/components/Card/Card.vue';
import ChipItem from '@/components/ChipItem/ChipItem.vue';

import { useDelayPredictionCard } from './DelayPredictionCard';
import type { DelayPredictionCardProps } from './DelayPredictionCard.d';

const cardProps = defineProps<DelayPredictionCardProps>();

const {
  formatDelayMinutes,
  formatProbability,
  getDelayBands,
  getDelayTone,
  hasContent,
  t,
} = useDelayPredictionCard(cardProps);
</script>

<template>
  <Card v-if="hasContent">
    <template #custom>
      <Item label="delayStopHistoryTitle" type="connection" css="card__title" />
      <Item :text="cardProps.delayNote" css="card__note" />

      <div v-if="cardProps.stopPredictionValue" class="card__summary">
        <ChipItem :label="cardProps.stopPredictionTitle" :text="cardProps.stopPredictionValue"
          :chip-type="cardProps.predictionTone" bold />
      </div>
      <div class="delay-prediction-card__calls">
        <article v-for="call in cardProps.relatedDelayCalls" :key="call.key" class="delay-prediction-card__call"
          :class="`delay-prediction-card__call--${getDelayTone(call.expectedDelayMinutes)}`">
          <strong>
            {{ call.stopName }} -
            <Item inline :label="call.eventType === 'departure' ? 'departureLabel' : 'arrivalLabel'" type="connection"
              bold />
          </strong>
          <span>
            {{ t('views.dashboard.events.connection.predictedDelayShort', {
              value: formatDelayMinutes(call.expectedDelayMinutes) ?? t('calendar.connection.timeUnknown'),
            }) }}
          </span>
          <span v-if="formatDelayMinutes(call.p50DelayMinutes)">
            {{ t('views.dashboard.events.connection.p50DelayShort', {
              value: formatDelayMinutes(call.p50DelayMinutes),
            }) }}
          </span>
          <span v-if="formatDelayMinutes(call.p90DelayMinutes)">
            {{ t('views.dashboard.events.connection.p90DelayShort', {
              value: formatDelayMinutes(call.p90DelayMinutes),
            }) }}
          </span>
          <span v-if="formatProbability(call.probabilityLate)">
            {{ t('views.dashboard.events.connection.probabilityLateShort', {
              value: formatProbability(call.probabilityLate),
            }) }}
          </span>
          <div v-if="call.distribution.length > 0" class="delay-prediction-card__scale">
            <div v-for="band in getDelayBands(call)" :key="`${call.key}-${band.key}`"
              class="delay-prediction-card__band">
              <span class="delay-prediction-card__band-label">{{ band.label }}</span>
              <span class="delay-prediction-card__band-track">
                <span class="delay-prediction-card__band-fill" :class="`delay-prediction-card__band-fill--${band.tone}`"
                  :style="{ width: `${Math.round(band.probability * 100)}%` }"></span>
              </span>
              <span class="delay-prediction-card__band-value">
                {{ formatProbability(band.probability) ?? formatProbability(0) }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </template>
  </Card>
</template>

<style scoped src="./DelayPredictionCard.css"></style>
