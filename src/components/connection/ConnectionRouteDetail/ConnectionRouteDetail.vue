<script setup lang="ts">
import DelayPredictionCard from '@/components/connection/DelayPredictionCard/DelayPredictionCard.vue';
import TransferCard from '@/components/connection/TransferCard/TransferCard.vue';
import ExpandToggle from '@/components/ExpandToggle/ExpandToggle.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import Item from '@/components/Item/Item.vue';
import Train from '@/components/Train/Train.vue';
import { useConnectionRouteDetail } from './ConnectionRouteDetail.ts';
import type { ConnectionRouteDetailProps } from './ConnectionRouteDetail.d';

const props = defineProps<ConnectionRouteDetailProps>();

const {
  getParkingDistanceLabel,
  getPurposeLabel,
  getSharingDistanceLabel,
  hasStationChange,
  hasStopMobilityHubData,
  normalizeOperatorLabel,
  parkingCategories,
  sharingCategories,
  shouldShowIncomingLine,
  shouldShowOutgoingLine,
  stopAddress,
  stopMobilityHubGroup,
  t,
  transferDistanceLabel,
  transferFeasibilityLabel,
  incomingStationLink,
  missedProbabilityLabel,
  outgoingWalkStationLink,
  transferLabel,
  transferRouteLink,
  transferStationChangeLabel,
  transferTone,
  transferWalkSummary,
} = useConnectionRouteDetail(props);
</script>

<template>
  <div class="connection-route-stop-details" :set="stop = props.stop">
    <!-- ADDRESS: start or end-->
    <div v-if="stopAddress" class="connection-route-address-row">
      <Item label="addressLabel" :label-style="{ bold: true }" type="connection" />
      <Item :value="stopAddress" type="connection" />
    </div>

    <!-- TIME: start or end -->
    <div class="connection-route-time-grid">
      <ChipItem chip-type="gray" v-if="stop.departureTime" label="departureLabel" :value="stop.departureTime"
        :label-style="{ bold: true }" type="connection" />
      <ChipItem chip-type="gray" v-if="stop.arrivalTime" label="arrivalLabel" :label-style="{ bold: true }"
        :value="stop.arrivalTime" type="connection" />
    </div>

    <!-- TRANSFER: incoming segment (e.g walk)-->
    <div v-if="props.stop.incomingSegment && shouldShowIncomingLine" class="connection-route-lines">
      <Train :segment="props.stop.incomingSegment" />
      <Item label="arrivalLabel" :value="props.stop.incomingSegment.arrivalTime" type="connection" />
    </div>
    <!-- TRANSFER: outgoing segment (e.g train)-->
    <div v-if="props.stop.outgoingSegment && shouldShowOutgoingLine" class="connection-route-lines">
      <Train :segment="props.stop.outgoingSegment" />
    </div>

    <TransferCard :has-station-change="hasStationChange" :incoming-station-link="incomingStationLink"
      :missed-probability-label="missedProbabilityLabel" :outgoing-walk-station-link="outgoingWalkStationLink"
      :transfer-distance-label="transferDistanceLabel" :transfer-feasibility-label="transferFeasibilityLabel"
      :transfer-label="transferLabel" :transfer-route-link="transferRouteLink"
      :transfer-station-change-label="transferStationChangeLabel" :transfer-tone="transferTone"
      :transfer-walk-summary="transferWalkSummary" />
    <DelayPredictionCard :delay-note="props.delayPrediction?.historyNote ?? null"
      :prediction-tone="props.predictionTone" :related-delay-calls="props.relatedDelayCalls"
      :stop-prediction-title="props.stopPredictionTitle ?? null"
      :stop-prediction-value="props.stopPredictionValue ?? null" />

    <section v-if="hasStopMobilityHubData && stopMobilityHubGroup" class="connection-route-mobility">
      <div v-for="category in sharingCategories" :key="`sharing-${props.stop.key}-${category.id}`"
        class="connection-route-mobility-subsection" data-expand-host>
        <strong class="connection-route-mobility-subtitle">
          <SvgIcon :icon="category.icon" :dimension="14" aria-hidden="true" />
          {{ category.title }}
        </strong>
        <article v-for="station in category.previewStations"
          :key="station.stationId ?? `${props.stop.key}-${station.name}-${station.lat}-${station.lon}`"
          class="connection-route-mobility-item">
          <strong>{{ station.name }}</strong>
          <p>{{ t('views.dashboard.events.connection.mobility.operator', {
            value:
              normalizeOperatorLabel(station.operator)
          }) }}</p>
          <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getSharingDistanceLabel(station) }) }}
          </p>
          <p v-if="station.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', {
            value:
              station.capacity
          }) }}</p>
          <ul v-if="station.realtimeAvailability.length > 0" class="connection-route-mobility-list">
            <li v-for="availability in station.realtimeAvailability"
              :key="`${station.stationId ?? station.name}-${availability.key}`">
              {{ t('views.dashboard.events.connection.mobility.realtimeCapacity', {
                mode: availability.mode, value:
                  availability.value
              }) }}
            </li>
          </ul>
        </article>
        <ExpandToggle v-if="category.overflowStations.length > 0" class="connection-route-mobility-more-button"
          :target-id="category.contentId" surface-mode="plain" label-mode="text+emoji"
          collapsed-label-key="views.dashboard.events.connection.mobility.more"
          expanded-label-key="views.dashboard.events.connection.mobility.showLess" />

        <div :id="category.contentId" class="expand-toggle-target expand-toggle-target--collapsed">
          <article v-for="station in category.overflowStations"
            :key="station.stationId ?? `${props.stop.key}-${station.name}-${station.lat}-${station.lon}`"
            class="connection-route-mobility-item">
            <strong>{{ station.name }}</strong>
            <p>{{ t('views.dashboard.events.connection.mobility.operator', {
              value:
                normalizeOperatorLabel(station.operator)
            }) }}</p>
            <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getSharingDistanceLabel(station) })
            }}
            </p>
            <p v-if="station.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', {
              value:
                station.capacity
            }) }}</p>
            <ul v-if="station.realtimeAvailability.length > 0" class="connection-route-mobility-list">
              <li v-for="availability in station.realtimeAvailability"
                :key="`${station.stationId ?? station.name}-${availability.key}`">
                {{ t('views.dashboard.events.connection.mobility.realtimeCapacity', {
                  mode: availability.mode, value:
                    availability.value
                }) }}
              </li>
            </ul>
          </article>
        </div>
      </div>

      <div v-for="category in parkingCategories" :key="`parking-${props.stop.key}-${category.id}`"
        class="connection-route-mobility-subsection" data-expand-host>
        <strong class="connection-route-mobility-subtitle">
          <span class="connection-route-mobility-parking-icon" aria-hidden="true"></span>
          {{ category.title }}
        </strong>
        <article v-for="site in category.previewSites"
          :key="site.id ?? `${props.stop.key}-${site.name}-${site.lat}-${site.lon}`"
          class="connection-route-mobility-item">
          <strong>{{ site.name }}</strong>
          <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getParkingDistanceLabel(site) }) }}
          </p>
          <p v-if="site.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', {
            value:
              site.capacity
          }) }}</p>
          <p>{{ t('views.dashboard.events.connection.mobility.purpose', { value: getPurposeLabel(site.purpose) }) }}</p>
        </article>
        <ExpandToggle v-if="category.overflowSites.length > 0" class="connection-route-mobility-more-button"
          :target-id="category.contentId" surface-mode="plain" label-mode="text+emoji"
          collapsed-label-key="views.dashboard.events.connection.mobility.more"
          expanded-label-key="views.dashboard.events.connection.mobility.showLess" />

        <div :id="category.contentId" class="expand-toggle-target expand-toggle-target--collapsed">
          <article v-for="site in category.overflowSites"
            :key="site.id ?? `${props.stop.key}-${site.name}-${site.lat}-${site.lon}`"
            class="connection-route-mobility-item">
            <strong>{{ site.name }}</strong>
            <p>{{ t('views.dashboard.events.connection.mobility.distance', { value: getParkingDistanceLabel(site) }) }}
            </p>
            <p v-if="site.capacity !== null">{{ t('views.dashboard.events.connection.mobility.capacity', {
              value:
                site.capacity
            }) }}</p>
            <p>{{ t('views.dashboard.events.connection.mobility.purpose', { value: getPurposeLabel(site.purpose) }) }}
            </p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped src="./ConnectionRouteDetail.css"></style>
