<script setup lang="ts">
import ProductIcon from '@/components/ProductIcon/ProductIcon.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import ConnectionRouteDetail from '@/components/connection/ConnectionRouteDetail/ConnectionRouteDetail.vue';
import { useConnectionRouteDetails } from './ConnectionRouteDetails.ts';
import type { ConnectionRouteDetailsProps } from './ConnectionRouteDetails.d';

const props = defineProps<ConnectionRouteDetailsProps>();

const {
  getOffsetLabel,
  getPredictionTone,
  getRelatedDelayCalls,
  getStopMeta,
  getStopPredictionLabel,
  getStopPredictionTitle,
  getStopPredictionValue,
  getTransferAssessment,
  isPastStop,
  isSelectedStop,
  routeStops,
  selectedStopIndex,
  t,
  toggleStop,
} = useConnectionRouteDetails(props);
</script>

<template>
  <div v-if="routeStops.length > 0" class="connection-route">
    <div class="connection-route-overview">
      <strong class="connection-route-title">{{ props.title ?? t('views.dashboard.events.connection.route')
        }}</strong>
      <div class="connection-route-overview-times">
        <span>{{ t('views.dashboard.events.connection.departureLabel') }} {{ props.option.departureTime }}</span>
        <span>{{ t('views.dashboard.events.connection.arrivalLabel') }} {{ props.option.arrivalTime }}</span>
      </div>
    </div>

    <ol class="connection-route-list">
      <li v-for="(stop, index) in routeStops" :key="stop.key" class="connection-route-item" :class="{
        'connection-route-item--past': isPastStop(index),
        'connection-route-item--selected': isSelectedStop(index),
      }">
        <div class="connection-route-track" aria-hidden="true">
          <span class="connection-route-rail connection-route-rail--top" :class="{
            'connection-route-rail--hidden': index === 0,
            'connection-route-rail--muted': isPastStop(index),
          }"></span>
          <span class="connection-route-dot" :class="{ 'connection-route-dot--muted': isPastStop(index) }">
            <ProductIcon class="connection-route-dot-product" :stop="stop" />
          </span>
          <span class="connection-route-rail connection-route-rail--bottom" :class="{
            'connection-route-rail--hidden': index === routeStops.length - 1,
            'connection-route-rail--muted': selectedStopIndex !== null && index < selectedStopIndex,
          }"></span>
        </div>
        <div class="connection-route-stop-shell">
          <button type="button" class="connection-route-stop-trigger" :aria-expanded="isSelectedStop(index)"
            @click="toggleStop(index)">
            <span class="connection-route-stop-copy">
              <strong class="connection-route-stop-name">{{ stop.name }}</strong>
              <span class="connection-route-stop-meta">{{ getStopMeta(stop) }}</span>
            </span>
            <span class="connection-route-stop-side">
              <span v-if="getStopPredictionLabel(index)" class="connection-route-prediction-button"
                :class="`connection-route-prediction-button--${getPredictionTone(index)}`"
                @click.stop="toggleStop(index)">
                {{ getStopPredictionLabel(index) }}
              </span>
              <span v-if="getOffsetLabel(stop)" class="connection-route-offset">{{ getOffsetLabel(stop) }}</span>
              <SvgIcon :icon="isSelectedStop(index) ? 'material/expand_less' : 'material/expand_more'" :dimension="20"
                aria-hidden="true" />
            </span>
          </button>

          <ConnectionRouteDetail v-if="isSelectedStop(index)" :stop="stop"
            :delay-prediction="props.delayPrediction ?? null" :origin-address="props.originAddress ?? null"
            :destination-address="props.destinationAddress ?? null" :prediction-tone="getPredictionTone(index)"
            :stop-prediction-title="getStopPredictionTitle(index)"
            :stop-prediction-value="getStopPredictionValue(index)" :related-delay-calls="getRelatedDelayCalls(index)"
            :transfer-assessment="getTransferAssessment(index)" />
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped src="./ConnectionRouteDetails.css"></style>
