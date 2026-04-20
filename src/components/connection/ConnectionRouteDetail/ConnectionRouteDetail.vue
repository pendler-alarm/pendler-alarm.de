<script setup lang="ts">
import Chip from '@/components/Chip/Chip.vue';
import ProductIcon from '@/components/ProductIcon/ProductIcon.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import Item from '@/components/Item/Item.vue';
import Train from '@/components/Train/Train.vue';
import { useConnectionRouteDetail } from './ConnectionRouteDetail.ts';
import type { ConnectionRouteDetailProps } from './ConnectionRouteDetail.d';

const props = defineProps<ConnectionRouteDetailProps>();

const {
  formatConnectionServiceLabel,
  formatDelayMinutes,
  formatProbability,
  getDelayBands,
  getDelayTone,
  getMobilityMoreKey,
  getParkingDistanceLabel,
  getPurposeLabel,
  getSharingDistanceLabel,
  getVisibleItems,
  hasStationChange,
  hasStopMobilityHubData,
  isMobilityExpanded,
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
  toggleMobilityExpanded,
  transferLabel,
  transferRouteLink,
  transferTone,
} = useConnectionRouteDetail(props);
</script>

<template>
  <div class="connection-route-stop-details" :set="stop = props.stop">
    <div v-if="stopAddress" class="connection-route-address-row">
      <Item label="addressLabel" :label-style="{ bold: true }" type="connection" />
      <Item :value="stopAddress" type="connection" />
    </div>

    <div class="connection-route-time-grid">
      <Chip type="gray" v-if="stop.arrivalTime">
        <template #custom>
          <Item label="arrivalLabel" :label-style="{ bold: true }" :value="stop.arrivalTime" type="connection" />
        </template>
      </Chip>
      <Chip type="gray" v-if="stop.departureTime">
        <template #custom>
          <Item label="departureLabel" :label-style="{ bold: true }" :value="stop.departureTime" type="connection" />
        </template>
      </Chip>
    </div>

    <div v-if="props.stop.incomingSegment && shouldShowIncomingLine" class="connection-route-lines">
      <Train :segment="props.stop.incomingSegment" />
      <Item label="arrivalLabel" :value="props.stop.incomingSegment.arrivalTime" type="connection" />
    </div>

    <div v-if="props.stop.outgoingSegment && shouldShowOutgoingLine" class="connection-route-lines">
      <Train :segment="props.stop.outgoingSegment" />
    </div>

    <div v-if="transferLabel" class="connection-route-transfer-card"
      :class="`connection-route-transfer-card--${transferTone}`">
      <p class="connection-route-transfer">{{ transferLabel }}</p>
      <p v-if="hasStationChange" class="connection-route-transfer-summary">
        x{{ t('views.dashboard.events.connection.transferWalkSummary', {
          from: props.stop.incomingSegment?.toStop ?? props.stop.name,
          to: props.stop.outgoingSegment?.productType === 'walk' ? props.stop.outgoingSegment.toStop :
            props.stop.outgoingSegment?.fromStop ?? props.stop.name,
        }) }}
      </p>
      <div class="connection-route-transfer-extras">
        <Chip :text="hasStationChange ? t('views.dashboard.events.connection.transferStationChange') : undefined"
          emoji="🚶" type="connection" />
        <Chip :text="transferDistanceLabel
          ? t('views.dashboard.events.connection.transferDistance', { value: transferDistanceLabel })
          : undefined" emoji="📏" type="connection" />
        <Chip :text="transferFeasibilityLabel ?? undefined"
          :type="transferTone === 'neutral' ? 'connection' : `connection-${transferTone}`" />
        <Chip :text="missedProbabilityLabel
          ? t('views.dashboard.events.connection.transferMissedShort', { value: missedProbabilityLabel })
          : undefined" type="connection" />
        <Chip :link="transferRouteLink ?? undefined" type="connection-link" />
        <Chip :link="incomingStationLink ?? undefined" type="connection-link" />
        <Chip :link="outgoingWalkStationLink ?? undefined" type="connection-link" />
      </div>
    </div>

    <section v-if="props.relatedDelayCalls.length > 0 || props.stopPredictionValue"
      class="connection-route-delay-history">
      <strong class="connection-route-delay-title">{{ t('views.dashboard.events.connection.delayStopHistoryTitle')
      }}</strong>
      <p v-if="props.delayPrediction?.historyNote" class="connection-route-delay-note">
        {{ props.delayPrediction.historyNote }}
      </p>
      <div class="connection-route-time-grid">
        <div v-if="props.stopPredictionValue" class="connection-route-detail-row"
          :class="`connection-route-detail-row--${props.predictionTone}`">
          <span class="connection-route-detail-label">{{ props.stopPredictionTitle }}</span>
          <span class="connection-route-detail-value">{{ props.stopPredictionValue }}</span>
        </div>
      </div>
      <div class="connection-route-delay-calls">
        <article v-for="call in props.relatedDelayCalls" :key="call.key" class="connection-route-delay-call"
          :class="`connection-route-delay-call--${getDelayTone(call.expectedDelayMinutes)}`">
          <strong>{{ call.stopName }} · {{ call.eventType === 'departure' ?
            t('views.dashboard.events.connection.departureLabel') : t('views.dashboard.events.connection.arrivalLabel')
          }}</strong>
          <span>{{ t('views.dashboard.events.connection.predictedDelayShort', {
            value:
              formatDelayMinutes(call.expectedDelayMinutes) ?? t('calendar.connection.timeUnknown')
          }) }}</span>
          <span v-if="formatDelayMinutes(call.p50DelayMinutes)">{{ t('views.dashboard.events.connection.p50DelayShort',
            { value: formatDelayMinutes(call.p50DelayMinutes) }) }}</span>
          <span v-if="formatDelayMinutes(call.p90DelayMinutes)">{{ t('views.dashboard.events.connection.p90DelayShort',
            { value: formatDelayMinutes(call.p90DelayMinutes) }) }}</span>
          <span v-if="formatProbability(call.probabilityLate)">{{
            t('views.dashboard.events.connection.probabilityLateShort', {
              value: formatProbability(call.probabilityLate)
            }) }}</span>
          <div v-if="call.distribution.length > 0" class="connection-route-delay-scale">
            <div v-for="band in getDelayBands(call)" :key="`${call.key}-${band.key}`"
              class="connection-route-delay-band">
              <span class="connection-route-delay-band-label">{{ band.label }}</span>
              <span class="connection-route-delay-band-track">
                <span class="connection-route-delay-band-fill" :class="`connection-route-delay-band-fill--${band.tone}`"
                  :style="{ width: `${Math.round(band.probability * 100)}%` }"></span>
              </span>
              <span class="connection-route-delay-band-value">{{ formatProbability(band.probability) ??
                formatProbability(0) }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="hasStopMobilityHubData && stopMobilityHubGroup" class="connection-route-mobility">
      <div v-for="category in sharingCategories" :key="`sharing-${props.stop.key}-${category.id}`"
        class="connection-route-mobility-subsection">
        <strong class="connection-route-mobility-subtitle">
          <SvgIcon :icon="category.icon" :dimension="14" aria-hidden="true" />
          {{ category.title }}
        </strong>
        <article v-for="station in getVisibleItems(category.stations, getMobilityMoreKey('sharing', category.id))"
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
        <button v-if="category.stations.length > 3" type="button" class="connection-route-mobility-more-button"
          @click="toggleMobilityExpanded(getMobilityMoreKey('sharing', category.id))">
          {{
            isMobilityExpanded(getMobilityMoreKey('sharing', category.id))
              ? t('views.dashboard.events.connection.mobility.showLess')
              : t('views.dashboard.events.connection.mobility.more')
          }}
        </button>
      </div>

      <div v-for="category in parkingCategories" :key="`parking-${props.stop.key}-${category.id}`"
        class="connection-route-mobility-subsection">
        <strong class="connection-route-mobility-subtitle">
          <span class="connection-route-mobility-parking-icon" aria-hidden="true"></span>
          {{ category.title }}
        </strong>
        <article v-for="site in getVisibleItems(category.sites, getMobilityMoreKey('parking', category.id))"
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
        <button v-if="category.sites.length > 3" type="button" class="connection-route-mobility-more-button"
          @click="toggleMobilityExpanded(getMobilityMoreKey('parking', category.id))">
          {{
            isMobilityExpanded(getMobilityMoreKey('parking', category.id))
              ? t('views.dashboard.events.connection.mobility.showLess')
              : t('views.dashboard.events.connection.mobility.more')
          }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped src="./ConnectionRouteDetail.css"></style>
