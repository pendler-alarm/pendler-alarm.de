<script setup lang="ts">
import ExpandToggle from '@/components/ExpandToggle/ExpandToggle.vue';
import { toggleExpandTarget } from '@/components/ExpandToggle/ExpandToggle.ts';
import ProductIcon from '@/components/ProductIcon/ProductIcon.vue';
import ConnectionRouteDetail from '@/components/connection/ConnectionRouteDetail/ConnectionRouteDetail.vue';
import { useConnectionRouteDetails } from './ConnectionRouteDetails.ts';
import type { ConnectionRouteDetailsProps } from './ConnectionRouteDetails.d';
import Chip from '@/components/Chip/Chip.vue';
import Item from '@/components/Item/Item.vue';


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
  routeStops,
  routeStopGroupId,
  t,
} = useConnectionRouteDetails(props);
</script>

<template>
  <div v-if="routeStops.length > 0" class="connection-route">
    <div class="connection-route-overview" :set="option = props.option">
      <strong class="connection-route-title">{{ props.title ?? t('views.dashboard.events.connection.route')
      }}</strong>
      <div class="connection-route-overview-times">
        <Item label="departureLabel" :value="option.departureTime" type="connection" />
        <Item label="arrivalLabel" :value="option.arrivalTime" type="connection" />
      </div>
    </div>

    <ol class="connection-route-list">
      <li v-for="(stop, index) in routeStops" :key="stop.key" class="connection-route-item" data-expand-host>
        <div class="connection-route-track" aria-hidden="true">
          <span class="connection-route-rail connection-route-rail--top" :class="{
            'connection-route-rail--hidden': index === 0,
          }"></span>
          <span class="connection-route-dot">
            <ProductIcon class="connection-route-dot-product" :stop="stop" />
          </span>
          <span class="connection-route-rail connection-route-rail--bottom" :class="{
            'connection-route-rail--hidden': index === routeStops.length - 1,
          }"></span>
        </div>
        <div class="connection-route-stop-shell">
          <button type="button" class="connection-route-stop-trigger" :aria-controls="stop.contentId"
            aria-expanded="false" :data-expand-target="stop.contentId" @click="toggleExpandTarget(stop.contentId)">
            <span class="connection-route-stop-copy">
              <strong class="connection-route-stop-name">{{ stop.name }}</strong>
              <span class="connection-route-stop-meta">{{ getStopMeta(stop) }}</span>
            </span>
            <span class="connection-route-stop-side">
              <span v-if="getStopPredictionLabel(stop)" class="connection-route-prediction-button"
                :class="`connection-route-prediction-button--${getPredictionTone(stop)}`"
                @click.stop="toggleExpandTarget(stop.contentId)">
                {{ getStopPredictionLabel(stop) }}
              </span>
              <Chip :text="getOffsetLabel(stop)" class="connection-route-offset" type="blank" />
              <ExpandToggle :target-id="stop.contentId" :group-id="routeStopGroupId" group-mode="accordion"
                surface-mode="plain" label-mode="emoji" :interactive="false" />
            </span>
          </button>

          <!-- TODO: reduce on stop and call get-functions in the component or by other component-->
          <ConnectionRouteDetail :id="stop.contentId" class="expand-toggle-target expand-toggle-target--collapsed"
            :stop="stop" :delay-prediction="props.delayPrediction ?? null" :origin-address="props.originAddress ?? null"
            :destination-address="props.destinationAddress ?? null" :prediction-tone="getPredictionTone(stop)"
            :stop-prediction-title="getStopPredictionTitle(stop)" :stop-prediction-value="getStopPredictionValue(stop)"
            :related-delay-calls="getRelatedDelayCalls(stop)" :transfer-assessment="getTransferAssessment(stop)" />
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped src="./ConnectionRouteDetails.css"></style>
