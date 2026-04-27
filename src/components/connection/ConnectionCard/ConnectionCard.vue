<template>
  <div class="connection-card" data-expand-host>
    <div class="connection-topline">
      <!-- departure-->
      <ChipItem label="leaveAt" chip-type="connection-time" :label-props="{ time: connection.departureTime }"
        :label-style="{ bold: true }" type="connection" />
      <!-- delay information-->
      <div class="connection-topline-meta">
        <ChipItem v-if="isDelayed" chip-type="bad" label="delayed" :label-style="{ bold: true }" type="connection" />
        <ChipItem v-if="!isDelayed" chip-type="success" :label-style="{ bold: true }" label="onTime"
          type="connection" />
        <ChipItem label="delayAvailableBadge" chip-type="blue" v-if="connection.delayPrediction"
          :label-style="{ bold: true }" type="connection" />
        <ExpandToggle :target-id="detailsContentId" group-id="dashboard-connections" surface-mode="plain"
          label-mode="emoji" @toggle="emitToggle" />
      </div>
    </div>

    <div class="connection-visual">
      <strong class="connection-time">{{ connection.departureTime }}</strong>
      <div class="connection-line-block">
        <div class="connection-badges">
          <template v-if="hasSegments">
            <span v-for="segment in connection.segments" :key="segment.id" class="connection-badge">
              <ProductIcon class="connection-badge-product" :product-type="segment.productType" :width="44" :height="20"
                :emoji-width="24" :emoji-font-size="'0.95rem'" />
              <span class="connection-badge-label">{{ segment.lineLabel }}</span>
            </span>
          </template>
          <template v-else v-for="mode in connection.transportModes" :key="mode">
            <span class="connection-badge">{{ mode }}</span>
          </template>
        </div>
        <span class="connection-line" aria-hidden="true"></span>
      </div>
      <strong class="connection-time">{{ connection.arrivalTime }}</strong>
    </div>

    <div v-if="deutschlandticketAvailable || bahnBookingUrl" class="connection-ticket-actions">
      <ChipItem v-if="deutschlandticketAvailable" label="deutschlandticketInfo" emoji="🎫" chip-type="white"
        type="connection" />
      <ChipItem label="bookTrainTicket" emoji="🛒" chip-type="white" :link="bahnBookingUrl" type="connection-link" />

      LINK:
      <ChipItem v-if="bahnBookingLink" :link="bahnBookingLink" type="connection-link" />

      <a v-if="bahnBookingUrl" class="connection-booking-link" :href="bahnBookingUrl" target="_blank"
        rel="noreferrer noopener">
        <SvgIcon icon="material/open_in_new" :dimension="16" aria-hidden="true" />
        <span>{{ t('views.dashboard.events.connection.bookTrainTicket') }}</span>
      </a>
    </div>

    <div :id="detailsContentId" class="connection-details expand-toggle-target expand-toggle-target--collapsed">
      <div class="connection-stops">
        <span>{{ connection.fromStop }}</span>
        <span>{{ connection.toStop }}</span>
      </div>

      <div class="connection-facts">
        <ChipItem chip-type="white" label="duration" emoji="⏱️" type="connection"
          :value="formatConnectionDuration(connection.durationMinutes)" />
        <ChipItem chip-type="white" label="transfers" emoji="🔁" type="connection" :value="connection.transferCount" />
        <ChipItem v-if="primaryLeadLabel" chip-type="white" emoji="🗓️" type="connection" :value="primaryLeadLabel" />
        <ChipItem chip-type="white" label="buffer" emoji="📶" type="connection"
          :label-props="{ count: connection.requestedBufferMinutes }" />
        <!-- TODO: showRaisedBufferHint needed?-->
        <ChipItem v-if="showRaisedBufferHint" chip-type="warn" label="bufferEffective" emoji="⚠️" type="connection"
          :label-props="{ count: connection.effectiveBufferMinutes }" />
      </div>

      <div class="connection-buffer-control">
        <div class="connection-buffer-header">
          <label class="connection-buffer-label" :for="bufferInputId">
            {{ t('views.dashboard.events.connection.bufferLabel') }}
          </label>
          <strong class="connection-buffer-value">{{ bufferValueLabel }}</strong>
        </div>
        <div class="connection-buffer-input-wrap">
          <input :id="bufferInputId" v-model.number="requestedBufferDraft" class="connection-buffer-range" type="range"
            min="0" max="60" step="1" @input="syncBufferDraft" @mouseup="commitBufferChange"
            @touchend="commitBufferChange" @keyup="handleBufferKeyboardCommit" @change="commitBufferChange">
        </div>
        <p class="connection-buffer-note">{{ t('views.dashboard.events.connection.bufferHint') }}</p>
        <p v-if="showRaisedBufferHint" class="connection-buffer-note connection-buffer-note--strong">
          {{ t('views.dashboard.events.connection.bufferRaised', { count: connection.effectiveBufferMinutes }) }}
        </p>
      </div>

      <div v-if="showRouteToggle" class="connection-route-switch">
        <button type="button" class="connection-route-switch-button"
          :class="{ 'connection-route-switch-button--active': selectedRoute === 'plan' }"
          @click="selectedRoute = 'plan'">
          {{ t('views.dashboard.events.connection.delayRoutePlan') }}
        </button>
        <button type="button" class="connection-route-switch-button"
          :class="{ 'connection-route-switch-button--active': selectedRoute === 'alternative' }"
          @click="selectedRoute = 'alternative'">
          {{ t('views.dashboard.events.connection.delayRouteAlternative') }}
        </button>
      </div>

      <p class="connection-route-switch-note">
        <Item label="delayAlternativeHint" :label-props="riskyTransferInfo" :emoji="'⚠️'" type="connection" />
      </p>
      <ConnectionRouteDetails v-if="hasSegments" :option="routeOption" :delay-prediction="routeDelayPrediction"
        :origin-address="originAddress" :destination-address="destinationAddress" :title="routeTitle" />

      <div v-if="connection.alternatives.length > 0" class="connection-alternatives">
        <strong class="connection-alternatives-title">
          {{ t('views.dashboard.events.connection.earlierOptions') }}
        </strong>
        <ul class="connection-alternatives-list">
          <li v-for="entry in alternativeEntries" :key="entry.key" class="connection-alternative" data-expand-host>
            <div>
              <div class="connection-alternative-summary">
                <span class="connection-alternative-main">
                  <span class="connection-alternative-time">
                    {{ t('views.dashboard.events.connection.leaveAt', { time: entry.option.departureTime }) }}
                  </span>
                  <span class="connection-alternative-arrival">{{ entry.option.arrivalTime }}</span>
                </span>
                <span class="connection-alternative-side">
                  <span class="connection-alternative-meta">
                    {{ t('views.dashboard.events.connection.transfers', { count: entry.option.transferCount }) }}
                  </span>
                  <span v-if="entry.leadLabel" class="connection-alternative-meta">
                    {{ entry.leadLabel }}
                  </span>
                  <span class="connection-alternative-meta">
                    {{ t('views.dashboard.events.connection.duration', {
                      value:
                        formatConnectionDuration(entry.option.durationMinutes)
                    }) }}
                  </span>
                </span>
                <ExpandToggle :target-id="entry.contentId" surface-mode="plain" label-mode="emoji" />
              </div>

              <div :id="entry.contentId"
                class="connection-alternative-details expand-toggle-target expand-toggle-target--collapsed">
                <div class="connection-facts connection-facts--alternative">
                  <ChipItem chip-type="white" label="duration" emoji="⏱️" type="connection"
                    :label-props="{ value: formatConnectionDuration(entry.option.durationMinutes) }" />
                  <ChipItem chip-type="white" label="transfers" emoji="🔁" type="connection"
                    :label-props="{ count: entry.option.transferCount }" />
                </div>

                <ConnectionRouteDetails :option="entry.option" :title="t('views.dashboard.events.connection.route')" />
              </div>
            </div>
          </li>
        </ul>
      </div>

      <SharingOptionCard v-if="sharingSuggestion" class="connection-sharing-inline" :suggestion="sharingSuggestion"
        :compact="true" />

      <p v-if="formattedUpdatedAt" class="connection-updated">
        <Item label="updatedAt" :label-props="{ time: formattedUpdatedAt }" type="connection" />
      </p>
    </div>
  </div>
</template>

<script src="./ConnectionCard.ts" lang="ts"></script>
<style scoped src="./ConnectionCard.css"></style>
