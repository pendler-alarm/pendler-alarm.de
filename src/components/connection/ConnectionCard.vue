<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SvgIcon from '@/components/SvgIcon.vue';
import type {
  ConnectionOption,
  ConnectionProductType,
  ConnectionSegment,
  ConnectionSummary,
} from '@/features/motis/routing-service';
import {
  formatConnectionDuration,
  getConnectionLeadLabel,
} from '@/components/connection/connection-utils';

const props = defineProps<{
  connection: ConnectionSummary;
  eventId?: string;
  eventStartIso?: string | null;
  lastUpdatedIso?: string | null;
  expanded?: boolean;
}>();

const emit = defineEmits<{
  (event: 'toggle'): void;
}>();

const { t, locale } = useI18n();

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

const getAlternativeKey = (alternative: ConnectionOption): string =>
  [
    props.eventId ?? 'connection',
    alternative.departureIso ?? alternative.arrivalIso ?? alternative.departureTime,
    alternative.arrivalIso ?? alternative.arrivalTime,
  ].join('-');

const getAlternativeLeadLabel = (alternative: ConnectionOption): string | null =>
  getConnectionLeadLabel(props.eventStartIso ?? null, alternative);

const getProductIcon = (type: ConnectionProductType): string => {
  switch (type) {
    case 'regio':
      return 'products/BAHN';
    case 'sbahn':
      return 'products/SBAHN';
    case 'ubahn':
      return 'products/UBAHN';
    case 'ferry':
      return 'products/FERRY';
    case 'bus':
      return 'products/BUS';
    case 'tram':
      return 'products/TRAM';
    default:
      return 'products/BAHN';
  }
};

const getProductFallbackLabel = (type: ConnectionProductType): string => {
  switch (type) {
    case 'regio':
      return 'RE';
    case 'sbahn':
      return 'S';
    case 'ubahn':
      return 'U';
    case 'bus':
      return 'Bus';
    case 'tram':
      return 'Tram';
    default:
      return 'Bahn';
  }
};

const getTransferLabel = (segment: ConnectionSegment, nextSegment?: ConnectionSegment): string => {
  if (!nextSegment) {
    return segment.toStop;
  }

  if (segment.toStop === nextSegment.fromStop) {
    return `${segment.toStop} · ${t('views.dashboard.events.connection.transfers', { count: 1 })}`;
  }

  return `${segment.toStop} → ${nextSegment.fromStop}`;
};

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
              <SvgIcon class="connection-badge-icon" :icon="getProductIcon(segment.productType)"
                :fallback-text="getProductFallbackLabel(segment.productType)" :width="44" :height="20" />
              X<span class="connection-badge-label">{{ segment.lineLabel }}</span>
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

    <div v-if="isExpanded" class="connection-details">
      <div class="connection-stops">
        <span>{{ connection.fromStop }}</span>
        <span>{{ connection.toStop }}</span>
      </div>

      <div class="connection-facts">
        <span class="connection-fact">
          ⏱️ {{ t('views.dashboard.events.connection.duration', {
            value:
              formatConnectionDuration(connection.durationMinutes) }) }}
        </span>
        <span class="connection-fact">
          🔁 {{ t('views.dashboard.events.connection.transfers', { count: connection.transferCount }) }}
        </span>
        <span v-if="primaryLeadLabel" class="connection-fact">
          🗓️ {{ primaryLeadLabel }}
        </span>
      </div>

      <div v-if="hasSegments" class="connection-route">
        <strong class="connection-route-title">{{ t('views.dashboard.events.connection.route') }}</strong>
        <ol class="connection-route-list">
          <li v-for="(segment, index) in connection.segments" :key="segment.id" class="connection-route-item">
            <div class="connection-route-content">
              <div class="connection-route-stop connection-route-stop--start">
                <div class="connection-route-marker">
                  <span class="connection-route-dot"></span>
                  <span v-if="index < connection.segments.length - 1" class="connection-route-rail"
                    aria-hidden="true"></span>
                </div>
                <span class="connection-route-stop-name">{{ segment.fromStop }}</span>
              </div>
              <div class="connection-route-header">
                <div class="connection-route-labels">
                  <SvgIcon class="connection-product-icon" :icon="getProductIcon(segment.productType)"
                    :fallback-text="getProductFallbackLabel(segment.productType)" :width="52" :height="24" />
                  <strong class="connection-route-line">{{ segment.lineLabel }}</strong>
                </div>
                <span class="connection-route-times">
                  {{ segment.departureTime }} - {{ segment.arrivalTime }}
                </span>
              </div>
              <div class="connection-route-stop connection-route-stop--end">
                <div class="connection-route-marker connection-route-marker--end" aria-hidden="true">
                  <span class="connection-route-dot"></span>
                </div>
                <span class="connection-route-stop-name">{{ segment.toStop }}</span>
              </div>
              <p v-if="index < connection.segments.length - 1" class="connection-transfer">
                {{ getTransferLabel(segment, connection.segments[index + 1]) }}
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div v-if="connection.alternatives.length > 0" class="connection-alternatives">
        <strong class="connection-alternatives-title">
          {{ t('views.dashboard.events.connection.earlierOptions') }}
        </strong>
        <ul class="connection-alternatives-list">
          <li v-for="alternative in connection.alternatives" :key="getAlternativeKey(alternative)"
            class="connection-alternative">
            <span class="connection-alternative-time">
              {{ t('views.dashboard.events.connection.leaveAt', { time: alternative.departureTime }) }}
            </span>
            <span class="connection-alternative-arrival">{{ alternative.arrivalTime }}</span>
            <span class="connection-alternative-meta">
              {{ t('views.dashboard.events.connection.transfers', { count: alternative.transferCount }) }}
            </span>
            <span v-if="getAlternativeLeadLabel(alternative)" class="connection-alternative-meta">
              {{ getAlternativeLeadLabel(alternative) }}
            </span>
          </li>
        </ul>
      </div>

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

.connection-route {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
}

.connection-route-title {
  font-size: 0.92rem;
  color: #7f1d1d;
}

.connection-route-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.connection-route-item {
  min-width: 0;
}

.connection-route-marker {
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  align-self: stretch;
}

.connection-route-marker--end {
  grid-template-rows: auto;
}

.connection-route-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #be123c;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9);
}

.connection-route-rail {
  width: 3px;
  min-height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(190, 24, 93, 0.75), rgba(190, 24, 93, 0.18));
}

.connection-route-content {
  display: grid;
  gap: 6px;
  padding-bottom: 14px;
}

.connection-route-stop {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.connection-route-stop--start {
  align-items: start;
}

.connection-route-stop-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.84rem;
  color: #4b5563;
}

.connection-route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.connection-route-labels {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.connection-product-icon {
  flex: 0 0 auto;
}

.connection-route-line {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #111827;
}

.connection-route-times,
.connection-transfer {
  font-size: 0.84rem;
  color: #4b5563;
}

.connection-transfer {
  margin: 0;
  color: #9f1239;
  font-weight: 600;
}

.connection-alternatives {
  display: grid;
  gap: 8px;
  padding-top: 4px;
}

.connection-alternatives-title {
  font-size: 0.9rem;
  color: #7f1d1d;
}

.connection-alternatives-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.connection-alternative {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, max-content));
  gap: 8px 12px;
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.connection-alternative-time {
  font-weight: 700;
  color: #7f1d1d;
}

.connection-alternative-arrival,
.connection-alternative-meta {
  min-width: 0;
  font-size: 0.85rem;
  color: #4b5563;
  overflow-wrap: anywhere;
}

.connection-updated {
  margin: 0;
  font-size: 0.78rem;
  color: #6b7280;
}

@media (max-width: 720px) {

  .connection-topline,
  .connection-route-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .connection-visual,
  .connection-stops,
  .connection-alternative {
    grid-template-columns: 1fr;
    display: grid;
  }

  .connection-stops span:last-child {
    text-align: left;
  }

  .connection-toggle-label {
    display: none;
  }
}
</style>
