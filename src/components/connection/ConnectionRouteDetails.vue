<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SvgIcon from '@/components/SvgIcon.vue';
import {
  formatConnectionServiceLabel,
  getConnectionProductEmoji,
  getConnectionProductFallbackLabel,
  getConnectionProductIcon,
} from '@/components/connection/connection-utils';
import type {
  ConnectionOption,
  ConnectionSegment,
} from '@/features/motis/routing-service';

const props = defineProps<{
  option: ConnectionOption;
  title?: string;
}>();

const { t } = useI18n();
const selectedStopIndex = ref<number | null>(null);

type RouteStopEntry = {
  key: string;
  kind: 'start' | 'stop' | 'end';
  name: string;
  minuteOffset: number | null;
  arrivalTime: string | null;
  departureTime: string | null;
  incomingSegment: ConnectionSegment | null;
  outgoingSegment: ConnectionSegment | null;
};

const getMinuteOffset = (value: string | null, reference: string | null): number | null => {
  if (!value || !reference) {
    return null;
  }

  const diffMs = new Date(value).getTime() - new Date(reference).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const routeStops = computed<RouteStopEntry[]>(() => {
  if (props.option.segments.length === 0) {
    return [];
  }

  const entries: RouteStopEntry[] = [];
  const [firstSegment] = props.option.segments;

  if (firstSegment) {
    entries.push({
      key: `${firstSegment.id}-start`,
      kind: 'start',
      name: firstSegment.fromStop,
      minuteOffset: 0,
      arrivalTime: null,
      departureTime: firstSegment.departureTime,
      incomingSegment: null,
      outgoingSegment: firstSegment,
    });
  }

  props.option.segments.forEach((segment, index) => {
    const nextSegment = props.option.segments[index + 1] ?? null;
    const isLast = index === props.option.segments.length - 1;

    entries.push({
      key: `${segment.id}-end`,
      kind: isLast ? 'end' : 'stop',
      name: segment.toStop,
      minuteOffset: getMinuteOffset(segment.arrivalIso, props.option.departureIso),
      arrivalTime: segment.arrivalTime,
      departureTime: nextSegment?.departureTime ?? null,
      incomingSegment: segment,
      outgoingSegment: nextSegment,
    });
  });

  return entries;
});

const toggleStop = (index: number): void => {
  selectedStopIndex.value = selectedStopIndex.value === index ? null : index;
};

const isPastStop = (index: number): boolean =>
  selectedStopIndex.value !== null && index < selectedStopIndex.value;

const isSelectedStop = (index: number): boolean => selectedStopIndex.value === index;

const getStopMarkerSegment = (stop: RouteStopEntry): ConnectionSegment | null => stop.outgoingSegment ?? stop.incomingSegment;

const getStopMarkerEmoji = (stop: RouteStopEntry): string | null => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment
    ? getConnectionProductEmoji(markerSegment.productType, { isDestination: stop.kind === 'end' })
    : (stop.kind === 'end' ? '🎯' : null);
};

const getStopMarkerIcon = (stop: RouteStopEntry): string | null => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment ? getConnectionProductIcon(markerSegment.productType) : null;
};

const getStopMarkerFallbackLabel = (stop: RouteStopEntry): string => {
  const markerSegment = getStopMarkerSegment(stop);

  return markerSegment ? getConnectionProductFallbackLabel(markerSegment.productType) : '•';
};

const getOffsetLabel = (stop: RouteStopEntry): string | null => {
  if (stop.minuteOffset === null || stop.minuteOffset <= 0) {
    return null;
  }

  return t('views.dashboard.events.connection.minutesFromStart', { count: stop.minuteOffset });
};

const getStopMeta = (stop: RouteStopEntry): string => {
  if (stop.kind === 'start') {
    return `${t('views.dashboard.events.connection.startLabel')} · ${t('views.dashboard.events.connection.departureLabel')} ${stop.departureTime ?? ''}`.trim();
  }

  if (stop.kind === 'end') {
    return `${t('views.dashboard.events.connection.endLabel')} · ${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime ?? ''}`.trim();
  }

  return [
    stop.arrivalTime ? `${t('views.dashboard.events.connection.arrivalLabel')} ${stop.arrivalTime}` : null,
    stop.departureTime ? `${t('views.dashboard.events.connection.continueLabel')} ${stop.departureTime}` : null,
  ].filter(Boolean).join(' · ');
};

const getTransferMinutes = (stop: RouteStopEntry): number | null => {
  if (!stop.incomingSegment?.arrivalIso || !stop.outgoingSegment?.departureIso) {
    return null;
  }

  const diffMs = new Date(stop.outgoingSegment.departureIso).getTime() - new Date(stop.incomingSegment.arrivalIso).getTime();

  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const getTransferLabel = (stop: RouteStopEntry): string | null => {
  if (!stop.incomingSegment || !stop.outgoingSegment) {
    return null;
  }

  const transferMinutes = getTransferMinutes(stop);

  return transferMinutes !== null && transferMinutes > 0
    ? t('views.dashboard.events.connection.transferBetweenWithTime', {
      from: formatConnectionServiceLabel(stop.incomingSegment),
      to: formatConnectionServiceLabel(stop.outgoingSegment),
      count: transferMinutes,
    })
    : t('views.dashboard.events.connection.transferBetween', {
      from: formatConnectionServiceLabel(stop.incomingSegment),
      to: formatConnectionServiceLabel(stop.outgoingSegment),
    });
};
</script>

<template>
  <div v-if="routeStops.length > 0" class="connection-route">
    <div class="connection-route-overview">
      <strong class="connection-route-title">{{ title ?? t('views.dashboard.events.connection.route') }}</strong>
      <div class="connection-route-overview-times">
        <span>{{ t('views.dashboard.events.connection.departureLabel') }} {{ option.departureTime }}</span>
        <span>{{ t('views.dashboard.events.connection.arrivalLabel') }} {{ option.arrivalTime }}</span>
      </div>
    </div>

    <ol class="connection-route-list">
      <li
        v-for="(stop, index) in routeStops"
        :key="stop.key"
        class="connection-route-item"
        :class="{
          'connection-route-item--past': isPastStop(index),
          'connection-route-item--selected': isSelectedStop(index),
        }"
      >
        <div class="connection-route-track" aria-hidden="true">
          <span
            class="connection-route-rail connection-route-rail--top"
            :class="{
              'connection-route-rail--hidden': index === 0,
              'connection-route-rail--muted': isPastStop(index),
            }"
          ></span>
          <span
            class="connection-route-dot"
            :class="{ 'connection-route-dot--muted': isPastStop(index) }"
          >
            <span
              v-if="getStopMarkerEmoji(stop)"
              class="connection-route-dot-emoji"
              aria-hidden="true"
            >{{ getStopMarkerEmoji(stop) }}</span>
            <SvgIcon
              v-else-if="getStopMarkerIcon(stop)"
              class="connection-route-dot-icon"
              :icon="getStopMarkerIcon(stop) ?? 'products/BAHN'"
              :fallback-text="getStopMarkerFallbackLabel(stop)"
              :width="18"
              :height="18"
            />
          </span>
          <span
            class="connection-route-rail connection-route-rail--bottom"
            :class="{
              'connection-route-rail--hidden': index === routeStops.length - 1,
              'connection-route-rail--muted': selectedStopIndex !== null && index < selectedStopIndex,
            }"
          ></span>
        </div>
        <div class="connection-route-stop-shell">
          <button
            type="button"
            class="connection-route-stop-trigger"
            :aria-expanded="isSelectedStop(index)"
            @click="toggleStop(index)"
          >
            <span class="connection-route-stop-copy">
              <strong class="connection-route-stop-name">{{ stop.name }}</strong>
              <span class="connection-route-stop-meta">{{ getStopMeta(stop) }}</span>
            </span>
            <span class="connection-route-stop-side">
              <span v-if="getOffsetLabel(stop)" class="connection-route-offset">{{ getOffsetLabel(stop) }}</span>
              <SvgIcon
                :icon="isSelectedStop(index) ? 'material/expand_less' : 'material/expand_more'"
                :dimension="20"
                aria-hidden="true"
              />
            </span>
          </button>

          <div v-if="isSelectedStop(index)" class="connection-route-stop-details">
            <div class="connection-route-time-grid">
              <div v-if="stop.arrivalTime" class="connection-route-detail-row">
                <span class="connection-route-detail-label">{{ t('views.dashboard.events.connection.arrivalLabel') }}</span>
                <span class="connection-route-detail-value">{{ stop.arrivalTime }}</span>
              </div>
              <div v-if="stop.departureTime" class="connection-route-detail-row">
                <span class="connection-route-detail-label">{{ t('views.dashboard.events.connection.departureLabel') }}</span>
                <span class="connection-route-detail-value">{{ stop.departureTime }}</span>
              </div>
            </div>

            <div v-if="stop.incomingSegment" class="connection-route-lines">
              <span
                v-if="getConnectionProductEmoji(stop.incomingSegment.productType)"
                class="connection-route-line-emoji"
                aria-hidden="true"
              >{{ getConnectionProductEmoji(stop.incomingSegment.productType) }}</span>
              <SvgIcon
                v-else
                class="connection-route-line-icon"
                :icon="getConnectionProductIcon(stop.incomingSegment.productType) ?? 'products/BAHN'"
                :fallback-text="getConnectionProductFallbackLabel(stop.incomingSegment.productType)"
                :width="48"
                :height="22"
              />
              <strong>{{ formatConnectionServiceLabel(stop.incomingSegment) }}</strong>
              <span>{{ t('views.dashboard.events.connection.arrivalLabel') }} {{ stop.incomingSegment.arrivalTime }}</span>
            </div>

            <div v-if="stop.outgoingSegment" class="connection-route-lines">
              <span
                v-if="getConnectionProductEmoji(stop.outgoingSegment.productType)"
                class="connection-route-line-emoji"
                aria-hidden="true"
              >{{ getConnectionProductEmoji(stop.outgoingSegment.productType) }}</span>
              <SvgIcon
                v-else
                class="connection-route-line-icon"
                :icon="getConnectionProductIcon(stop.outgoingSegment.productType) ?? 'products/BAHN'"
                :fallback-text="getConnectionProductFallbackLabel(stop.outgoingSegment.productType)"
                :width="48"
                :height="22"
              />
              <strong>{{ formatConnectionServiceLabel(stop.outgoingSegment) }}</strong>
              <span>{{ t('views.dashboard.events.connection.directionLabel', { stop: stop.outgoingSegment.toStop }) }}</span>
            </div>

            <p v-if="getTransferLabel(stop)" class="connection-route-transfer">
              {{ getTransferLabel(stop) }}
            </p>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.connection-route {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.connection-route-overview {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}

.connection-route-overview-times {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #52525b;
  font-size: 0.82rem;
}

.connection-route-title {
  font-size: 0.92rem;
  color: #7f1d1d;
}

.connection-route-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.connection-route-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}

.connection-route-item--past {
  opacity: 0.58;
}

.connection-route-track {
  display: grid;
  grid-template-rows: 10px 24px minmax(18px, 1fr);
  justify-items: center;
}

.connection-route-rail {
  width: 4px;
  border-radius: 999px;
  background: #be123c;
}

.connection-route-rail--hidden {
  visibility: hidden;
}

.connection-route-rail--muted {
  background: rgba(161, 161, 170, 0.9);
}

.connection-route-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 999px;
  background: #ffffff;
  border: 3px solid #be123c;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.connection-route-dot--muted {
  border-color: rgba(161, 161, 170, 0.9);
}

.connection-route-dot-icon {
  width: 18px;
  height: 18px;
}

.connection-route-dot-emoji {
  font-size: 0.82rem;
  line-height: 1;
}

.connection-route-stop-shell {
  min-width: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.connection-route-stop-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #27272a;
  text-align: left;
  cursor: pointer;
}

.connection-route-stop-copy,
.connection-route-stop-side,
.connection-route-stop-details {
  min-width: 0;
}

.connection-route-stop-copy {
  display: grid;
  gap: 4px;
}

.connection-route-stop-side {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}

.connection-route-stop-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
}

.connection-route-stop-meta {
  font-size: 0.8rem;
  color: #6b7280;
}

.connection-route-offset {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.74rem;
  font-weight: 700;
}

.connection-route-stop-details {
  display: grid;
  gap: 10px;
  padding: 10px 0 4px;
}

.connection-route-time-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.connection-route-detail-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #3f3f46;
  font-size: 0.84rem;
}

.connection-route-detail-label {
  font-weight: 700;
}

.connection-route-lines {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #27272a;
  font-size: 0.9rem;
}

.connection-route-line-icon {
  flex: 0 0 auto;
}

.connection-route-line-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 1rem;
}

.connection-route-transfer {
  margin: 0;
  color: #52525b;
  font-size: 0.84rem;
  font-weight: 600;
}

@media (max-width: 720px) {
  .connection-route-overview,
  .connection-route-stop-trigger {
    flex-direction: column;
    align-items: flex-start;
  }

  .connection-route-stop-side {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
