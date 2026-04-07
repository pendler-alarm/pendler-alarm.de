<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SvgIcon from '@/components/SvgIcon.vue';
import SharingOptionCard from '@/components/connection/SharingOptionCard.vue';
import ConnectionRouteDetails from '@/components/connection/ConnectionRouteDetails.vue';
import type {
  ConnectionOption,
  ConnectionSummary,
} from '@/features/motis/routing-service';
import {
  buildBahnBookingUrl,
  canUseDeutschlandticket,
  formatConnectionDuration,
  getConnectionLeadLabel,
  getConnectionProductEmoji,
  getConnectionProductFallbackLabel,
  getConnectionProductIcon,
  requiresTrainTicketBooking,
} from '@/components/connection/connection-utils';
import type { SharingSuggestion } from '@/features/sharing/sharing-service';

const props = defineProps<{
  connection: ConnectionSummary;
  eventId?: string;
  eventStartIso?: string | null;
  lastUpdatedIso?: string | null;
  expanded?: boolean;
  sharingSuggestion?: SharingSuggestion | null;
  deutschlandticketEnabled?: boolean;
  bahnBookingClass?: '1' | '2';
  bahnTravelerProfileParam?: string;
  originAddress?: string | null;
  destinationAddress?: string | null;
}>();

const emit = defineEmits<{
  (event: 'toggle'): void;
}>();

const { t, locale } = useI18n();
const expandedAlternatives = ref<Set<string>>(new Set());

const isExpanded = computed(() => props.expanded ?? false);

const primaryLeadLabel = computed(() =>
  getConnectionLeadLabel(props.eventStartIso ?? null, props.connection),
);

const formattedUpdatedAt = computed(() => {
  if (!props.lastUpdatedIso) {
    return null;
  }

  const date = new Date(props.lastUpdatedIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
});

const hasSegments = computed(() => props.connection.segments.length > 0);
const deutschlandticketActive = computed(() => props.deutschlandticketEnabled === true);
const deutschlandticketAvailable = computed(() =>
  deutschlandticketActive.value && canUseDeutschlandticket(props.connection),
);
const bahnBookingUrl = computed(() => {
  if (!requiresTrainTicketBooking(props.connection, deutschlandticketActive.value)) {
    return null;
  }

  return buildBahnBookingUrl(props.connection, {
    deutschlandticketEnabled: deutschlandticketActive.value,
    bookingClass: props.bahnBookingClass,
    travelerProfileParam: props.bahnTravelerProfileParam,
  });
});

const getAlternativeKey = (alternative: ConnectionOption): string =>
  [
    props.eventId ?? 'connection',
    alternative.departureIso ?? alternative.arrivalIso ?? alternative.departureTime,
    alternative.arrivalIso ?? alternative.arrivalTime,
  ].join('-');

const getAlternativeLeadLabel = (alternative: ConnectionOption): string | null =>
  getConnectionLeadLabel(props.eventStartIso ?? null, alternative);

const toggleAlternative = (alternativeKey: string): void => {
  const next = new Set(expandedAlternatives.value);

  if (next.has(alternativeKey)) {
    next.delete(alternativeKey);
  } else {
    next.add(alternativeKey);
  }

  expandedAlternatives.value = next;
};

const isAlternativeExpanded = (alternativeKey: string): boolean => expandedAlternatives.value.has(alternativeKey);

const selectedRoute = ref<'plan' | 'alternative'>('plan');

const riskyTransfer = computed(() => props.connection.delayPrediction?.transferAssessments
  .filter((assessment) => assessment.successProbability !== null)
  .sort((left, right) => (left.successProbability ?? 1) - (right.successProbability ?? 1))[0] ?? null);

const suggestedAlternative = computed(() => props.connection.alternatives[0] ?? null);
const showRouteToggle = computed(() => Boolean(suggestedAlternative.value));

const routeOption = computed(() => (
  showRouteToggle.value && selectedRoute.value === 'alternative'
    ? suggestedAlternative.value ?? props.connection
    : props.connection
));

const routeDelayPrediction = computed(() => (
  showRouteToggle.value && selectedRoute.value === 'alternative'
    ? null
    : props.connection.delayPrediction ?? null
));

const routeRiskLabel = computed(() => {
  if (!riskyTransfer.value?.successProbability && riskyTransfer.value?.successProbability !== 0) {
    return null;
  }

  return `${Math.round(riskyTransfer.value.successProbability * 100)} %`;
});

const toggleExpanded = (): void => {
  emit('toggle');
};
</script>

<template>
  <div class="connection-card" :class="{ 'connection-card--expanded': isExpanded }">
    <div class="connection-topline">
      <span class="connection-leave-at">
        {{ t('views.dashboard.events.connection.leaveAt', { time: connection.departureTime }) }}
      </span>
      <div class="connection-topline-meta">
        <span :class="[
          'connection-status',
          connection.status === 'delayed'
            ? 'connection-status--delayed'
            : 'connection-status--on-time',
        ]">
          {{
            connection.status === 'delayed'
              ? t('views.dashboard.events.connection.delayed')
              : t('views.dashboard.events.connection.onTime')
          }}
        </span>

        <span v-if="connection.delayPrediction" class="connection-status connection-status--prediction">
          {{ t('views.dashboard.events.connection.delayAvailableBadge') }}
        </span>
        <button type="button" class="connection-toggle" :aria-expanded="isExpanded" @click="toggleExpanded">
          <SvgIcon :icon="isExpanded ? 'material/expand_less' : 'material/expand_more'" :dimension="18"
            aria-hidden="true" />
          <span class="connection-toggle-label">
            {{
              isExpanded
                ? t('views.dashboard.events.connection.hideDetails')
                : t('views.dashboard.events.connection.showDetails')
            }}
          </span>
        </button>
      </div>
    </div>

    <div class="connection-visual">
      <strong class="connection-time">{{ connection.departureTime }}</strong>
      <div class="connection-line-block">
        <div class="connection-badges">
          <template v-if="hasSegments">
            <span v-for="segment in connection.segments" :key="segment.id" class="connection-badge">
              <span v-if="getConnectionProductEmoji(segment.productType)" class="connection-badge-emoji"
                aria-hidden="true">{{ getConnectionProductEmoji(segment.productType) }}</span>
              <SvgIcon v-else class="connection-badge-icon"
                :icon="getConnectionProductIcon(segment.productType) ?? 'products/BAHN'"
                :fallback-text="getConnectionProductFallbackLabel(segment.productType)" :width="44" :height="20" />
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
      <span v-if="deutschlandticketAvailable" class="connection-ticket-badge">
        <span class="connection-ticket-badge-logo" aria-hidden="true">🎫</span>
        <span>{{ t('views.dashboard.events.connection.deutschlandticketInfo') }}</span>
      </span>
      <a v-if="bahnBookingUrl" class="connection-booking-link" :href="bahnBookingUrl" target="_blank"
        rel="noreferrer noopener">
        <SvgIcon icon="material/open_in_new" :dimension="16" aria-hidden="true" />
        <span>{{ t('views.dashboard.events.connection.bookTrainTicket') }}</span>
      </a>
    </div>

    <div v-if="isExpanded" class="connection-details">
      <div class="connection-stops">
        <span>{{ connection.fromStop }}</span>
        <span>{{ connection.toStop }}</span>
      </div>

      <div class="connection-facts">
        <span class="connection-fact">
          ⏱️ {{ t('views.dashboard.events.connection.duration', {
            value: formatConnectionDuration(connection.durationMinutes)
          }) }}
        </span>
        <span class="connection-fact">
          🔁 {{ t('views.dashboard.events.connection.transfers', { count: connection.transferCount }) }}
        </span>
        <span v-if="primaryLeadLabel" class="connection-fact">
          🗓️ {{ primaryLeadLabel }}
        </span>
      </div>

      <div v-if="showRouteToggle" class="connection-route-switch">
        <button
          type="button"
          class="connection-route-switch-button"
          :class="{ 'connection-route-switch-button--active': selectedRoute === 'plan' }"
          @click="selectedRoute = 'plan'"
        >
          {{ t('views.dashboard.events.connection.delayRoutePlan') }}
        </button>
        <button
          type="button"
          class="connection-route-switch-button"
          :class="{ 'connection-route-switch-button--active': selectedRoute === 'alternative' }"
          @click="selectedRoute = 'alternative'"
        >
          {{ t('views.dashboard.events.connection.delayRouteAlternative') }}
        </button>
      </div>

      <p v-if="riskyTransfer && routeRiskLabel" class="connection-route-switch-note">
        {{ t('views.dashboard.events.connection.delayAlternativeHint', {
          from: riskyTransfer.fromStopName,
          to: riskyTransfer.toStopName,
          value: routeRiskLabel,
        }) }}
      </p>

      <ConnectionRouteDetails v-if="hasSegments" :option="routeOption"
        :delay-prediction="routeDelayPrediction"
        :origin-address="originAddress"
        :destination-address="destinationAddress"
        :title="showRouteToggle ? (selectedRoute === 'plan' ? t('views.dashboard.events.connection.delayRoutePlan') : t('views.dashboard.events.connection.delayRouteAlternative')) : t('views.dashboard.events.connection.route')" />


      <div v-if="connection.alternatives.length > 0" class="connection-alternatives">
        <strong class="connection-alternatives-title">
          {{ t('views.dashboard.events.connection.earlierOptions') }}
        </strong>
        <ul class="connection-alternatives-list">
          <li v-for="alternative in connection.alternatives" :key="getAlternativeKey(alternative)"
            class="connection-alternative">
            <button type="button" class="connection-alternative-summary"
              :aria-expanded="isAlternativeExpanded(getAlternativeKey(alternative))"
              @click="toggleAlternative(getAlternativeKey(alternative))">
              <span class="connection-alternative-main">
                <span class="connection-alternative-time">
                  {{ t('views.dashboard.events.connection.leaveAt', { time: alternative.departureTime }) }}
                </span>
                <span class="connection-alternative-arrival">{{ alternative.arrivalTime }}</span>
              </span>
              <span class="connection-alternative-side">
                <span class="connection-alternative-meta">
                  {{ t('views.dashboard.events.connection.transfers', { count: alternative.transferCount }) }}
                </span>
                <span v-if="getAlternativeLeadLabel(alternative)" class="connection-alternative-meta">
                  {{ getAlternativeLeadLabel(alternative) }}
                </span>
                <span class="connection-alternative-meta">
                  {{ t('views.dashboard.events.connection.duration', {
                    value:
                      formatConnectionDuration(alternative.durationMinutes)
                  }) }}
                </span>
              </span>
              <SvgIcon
                :icon="isAlternativeExpanded(getAlternativeKey(alternative)) ? 'material/expand_less' : 'material/expand_more'"
                :dimension="18" aria-hidden="true" />
            </button>

            <div v-if="isAlternativeExpanded(getAlternativeKey(alternative))" class="connection-alternative-details">
              <div class="connection-facts connection-facts--alternative">
                <span class="connection-fact">
                  ⏱️ {{ t('views.dashboard.events.connection.duration', {
                    value: formatConnectionDuration(alternative.durationMinutes)
                  }) }}
                </span>
                <span class="connection-fact">
                  🔁 {{ t('views.dashboard.events.connection.transfers', { count: alternative.transferCount }) }}
                </span>
              </div>

              <ConnectionRouteDetails :option="alternative" :title="t('views.dashboard.events.connection.route')" />
            </div>
          </li>
        </ul>
      </div>

      <SharingOptionCard v-if="sharingSuggestion" class="connection-sharing-inline" :suggestion="sharingSuggestion"
        :compact="true" />

      <p v-if="formattedUpdatedAt" class="connection-updated">
        {{ t('views.dashboard.events.connection.updatedAt', { time: formattedUpdatedAt }) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.connection-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.96), rgba(255, 232, 236, 0.92));
  border: 1px solid rgba(244, 114, 182, 0.22);
  color: #1f2937;
}

.connection-card--expanded {
  gap: 16px;
}

.connection-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.connection-topline-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.connection-leave-at {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #9f1239;
  background: rgba(255, 255, 255, 0.82);
}

.connection-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.connection-status--on-time {
  color: #166534;
  background: rgba(220, 252, 231, 0.92);
  border: 1px solid rgba(34, 197, 94, 0.22);
}

.connection-status--delayed {
  color: #92400e;
  background: rgba(254, 243, 199, 0.96);
  border: 1px solid rgba(245, 158, 11, 0.26);
}

.connection-status--prediction {
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.96);
  border: 1px solid rgba(96, 165, 250, 0.28);
}

.connection-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.78);
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.connection-visual {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.connection-time {
  font-size: 1.8rem;
  line-height: 1;
  color: #111827;
}

.connection-line-block {
  position: relative;
  display: grid;
  gap: 8px;
  min-width: 0;
}

.connection-line {
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #16a34a 0%, #16a34a 38%, #ef4444 38%, #ef4444 100%);
}

.connection-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.connection-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: #7f1d1d;
  font-size: 0.78rem;
  font-weight: 700;
}

.connection-badge-icon {
  flex: 0 0 auto;
}

.connection-badge-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 0.95rem;
}

.connection-badge-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-details {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.connection-ticket-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.connection-ticket-badge,
.connection-booking-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.connection-ticket-badge {
  color: #1f2937;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(234, 179, 8, 0.35);
}

.connection-ticket-badge-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
}

.connection-booking-link {
  color: #7c2d12;
  text-decoration: none;
  background: rgba(255, 247, 237, 0.92);
  border: 1px solid rgba(249, 115, 22, 0.24);
}

.connection-booking-link:hover,
.connection-booking-link:focus-visible {
  background: rgba(255, 237, 213, 0.98);
}

.connection-stops {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  font-size: 0.92rem;
  color: #4b5563;
}

.connection-stops span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.connection-stops span:last-child {
  text-align: right;
}

.connection-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.connection-facts--alternative {
  margin-bottom: 2px;
}

.connection-route-switch {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-route-switch-button {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.88);
  color: #334155;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.connection-route-switch-button--active {
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
}

.connection-route-switch-note {
  margin: -4px 0 0;
  color: #9a3412;
  font-size: 0.84rem;
  font-weight: 600;
}

.connection-fact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #374151;
  font-size: 0.85rem;
}

.connection-alternatives {
  display: grid;
  gap: 10px;
}

.connection-alternatives-title {
  font-size: 0.92rem;
  color: #7f1d1d;
}

.connection-alternatives-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.connection-alternative {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
}

.connection-alternative-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.connection-alternative-main,
.connection-alternative-side {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.connection-alternative-time,
.connection-alternative-arrival {
  font-weight: 700;
}

.connection-alternative-arrival {
  color: #111827;
}

.connection-alternative-side {
  justify-items: end;
}

.connection-alternative-meta {
  font-size: 0.82rem;
  color: #4b5563;
}

.connection-alternative-details {
  display: grid;
  gap: 10px;
}

.connection-updated {
  margin: 0;
  color: #6b7280;
  font-size: 0.8rem;
}

@media (max-width: 720px) {

  .connection-topline,
  .connection-alternative-summary {
    grid-template-columns: minmax(0, 1fr);
    display: grid;
  }

  .connection-topline-meta {
    justify-content: flex-start;
  }

  .connection-visual {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .connection-time:last-child {
    grid-column: 2;
    justify-self: end;
  }

  .connection-stops {
    grid-template-columns: minmax(0, 1fr);
  }

  .connection-stops span:last-child,
  .connection-alternative-side {
    text-align: left;
    justify-items: start;
  }
}
</style>
