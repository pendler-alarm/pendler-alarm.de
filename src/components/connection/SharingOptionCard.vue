<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SharingStation, SharingSuggestion } from '@/features/sharing/sharing-service';
import { formatConnectionDuration } from '@/components/connection/connection-utils';
import SharingJourneyDetails from '@/components/connection/SharingJourneyDetails.vue';

const props = withDefaults(defineProps<{
  suggestion: SharingSuggestion;
  compact?: boolean;
  targetLabel?: string;
  hideDestinationWalk?: boolean;
}>(), {
  compact: false,
  targetLabel: '',
  hideDestinationWalk: false,
});

const { t } = useI18n();
const compactDetailsOpen = ref(false);

watch(() => props.compact, (isCompact) => {
  if (!isCompact) {
    compactDetailsOpen.value = false;
  }
}, { immediate: true });

const availabilityVariant = computed<'success' | 'warning'>(() =>
  props.suggestion.originStation && props.suggestion.destinationStation ? 'success' : 'warning',
);

const primaryStation = computed<SharingStation | null>(() =>
  props.suggestion.originStation ?? props.suggestion.destinationStation ?? null,
);

const estimatedRideDuration = computed(() => {
  const metersPerMinute = (props.suggestion.averageSpeedKmh * 1000) / 60;
  const durationMinutes = Math.max(1, Math.round(props.suggestion.tripDistanceMeters / metersPerMinute));
  return formatConnectionDuration(durationMinutes);
});

const estimatedSpeedLabel = computed(() => t('views.dashboard.events.sharing.averageSpeed', {
  value: props.suggestion.averageSpeedKmh.toFixed(1),
}));

const resolvedTargetLabel = computed(() =>
  props.targetLabel.trim() || props.suggestion.destinationStation?.name || props.suggestion.providerLabel,
);

const compactPreviewLabel = computed(() =>
  props.targetLabel.trim() || props.suggestion.destinationStation?.name || t('views.dashboard.events.sharing.dropoff'),
);

const showExpandedContent = computed(() => !props.compact || compactDetailsOpen.value);
const showMap = computed(() => !props.compact && Boolean(getMapEmbedUrl(primaryStation.value)));

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  }

  return `${String(meters)} m`;
};

const getStationAvailability = (station: SharingStation, type: 'pickup' | 'dropoff'): string => {
  if (type === 'pickup') {
    if (typeof station.bikesAvailable === 'number') {
      return t('views.dashboard.events.sharing.bikesAvailable', { count: station.bikesAvailable });
    }

    return t('views.dashboard.events.sharing.availabilityUnknown');
  }

  if (typeof station.docksAvailable === 'number') {
    return t('views.dashboard.events.sharing.docksAvailable', { count: station.docksAvailable });
  }

  return station.isFreeFloating
    ? t('views.dashboard.events.sharing.flexibleDropoff')
    : t('views.dashboard.events.sharing.availabilityUnknown');
};

const getMapEmbedUrl = (station: SharingStation | null): string | null => {
  if (!station) {
    return null;
  }

  const deltaLat = 0.006;
  const deltaLon = 0.012;
  const params = new URLSearchParams({
    bbox: `${station.lon - deltaLon},${station.lat - deltaLat},${station.lon + deltaLon},${station.lat + deltaLat}`,
    layer: 'mapnik',
    marker: `${station.lat},${station.lon}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
};

const toggleCompactDetails = (): void => {
  if (!props.compact) {
    return;
  }

  compactDetailsOpen.value = !compactDetailsOpen.value;
};
</script>

<template>
  <section class="sharing-card" :class="[
    `sharing-card--${availabilityVariant}`,
    { 'sharing-card--compact': compact },
  ]">
    <div class="sharing-card-body" :class="{ 'sharing-card-body--compact': compact }">
      <div class="sharing-copy-block">
        <button
          v-if="compact"
          type="button"
          class="sharing-compact-toggle"
          :aria-expanded="compactDetailsOpen"
          @click="toggleCompactDetails"
        >
          <div class="sharing-compact-header">
            <div>
              <div class="sharing-pill-row">
                <span class="sharing-pill">🚲 {{ suggestion.providerLabel }}</span>
                <span v-if="suggestion.isPreferred" class="sharing-pill sharing-pill--preferred">
                  ⭐ {{ t('views.dashboard.events.sharing.preferredRoute') }}
                </span>
              </div>
              <strong class="sharing-title">{{ t('views.dashboard.events.sharing.title') }}</strong>
            </div>
            <div class="sharing-meta sharing-meta--compact">
              <span class="sharing-duration">{{ estimatedRideDuration }}</span>
              <span class="sharing-duration">{{ formatDistance(suggestion.tripDistanceMeters) }}</span>
            </div>
          </div>

          <div class="sharing-compact-journey" aria-hidden="true">
            <span class="sharing-compact-node sharing-compact-node--start">
              {{ suggestion.originStation?.name ?? t('views.dashboard.events.sharing.pickup') }}
            </span>
            <span class="sharing-compact-rail"></span>
            <span class="sharing-compact-bike">🚲</span>
            <span class="sharing-compact-rail"></span>
            <strong class="sharing-compact-node sharing-compact-node--target">
              {{ compactPreviewLabel }}
            </strong>
          </div>

          <div class="sharing-compact-footer">
            <span class="sharing-copy">
              {{ t('views.dashboard.events.connection.directionLabel', { stop: resolvedTargetLabel }) }}
            </span>
            <span class="sharing-expand-indicator">
              {{ compactDetailsOpen ? 'Details ausblenden' : 'Details anzeigen' }}
            </span>
          </div>
        </button>

        <template v-else>
          <div class="sharing-card-header">
            <div>
              <div class="sharing-pill-row">
                <span class="sharing-pill">🚲 {{ suggestion.providerLabel }}</span>
                <span v-if="suggestion.isPreferred" class="sharing-pill sharing-pill--preferred">
                  ⭐ {{ t('views.dashboard.events.sharing.preferredRoute') }}
                </span>
              </div>
              <strong class="sharing-title">{{ t('views.dashboard.events.sharing.title') }}</strong>
            </div>
            <div class="sharing-meta">
              <span class="sharing-distance">
                {{ t('views.dashboard.events.sharing.tripDistance', { value: formatDistance(suggestion.tripDistanceMeters) }) }}
              </span>
              <span class="sharing-duration">
                {{ t('views.dashboard.events.sharing.estimatedDuration', { value: estimatedRideDuration }) }}
              </span>
              <span class="sharing-duration">{{ estimatedSpeedLabel }}</span>
            </div>
          </div>
        </template>

        <template v-if="showExpandedContent">
          <p class="sharing-copy">
            {{
              t('views.dashboard.events.sharing.withinThreshold', {
                current: formatDistance(suggestion.tripDistanceMeters),
                max: formatDistance(suggestion.maxTripDistanceMeters),
              })
            }}
          </p>

          <p v-if="suggestion.recurringRouteSampleCount >= 3" class="sharing-footnote">
            {{ t('views.dashboard.events.sharing.recurringRouteHint', { count: suggestion.recurringRouteSampleCount }) }}
          </p>

          <SharingJourneyDetails :suggestion="suggestion" :target-label="resolvedTargetLabel" :hide-destination-walk="hideDestinationWalk" />

          <div class="sharing-grid">
            <div class="sharing-column">
              <span class="sharing-label">{{ t('views.dashboard.events.sharing.pickup') }}</span>
              <template v-if="suggestion.originStation">
                <strong>{{ suggestion.originStation.name }}</strong>
                <span>{{ formatDistance(suggestion.originStation.distanceMeters) }}</span>
                <span>{{ getStationAvailability(suggestion.originStation, 'pickup') }}</span>
              </template>
              <span v-else class="sharing-empty">
                {{ t('views.dashboard.events.sharing.noPickupNearby') }}
              </span>
            </div>

            <div class="sharing-column">
              <span class="sharing-label">{{ t('views.dashboard.events.sharing.dropoff') }}</span>
              <template v-if="suggestion.destinationStation">
                <strong>{{ suggestion.destinationStation.name }}</strong>
                <span>{{ formatDistance(suggestion.destinationStation.distanceMeters) }}</span>
                <span>{{ getStationAvailability(suggestion.destinationStation, 'dropoff') }}</span>
              </template>
              <span v-else class="sharing-empty">
                {{ t('views.dashboard.events.sharing.noDropoffNearby') }}
              </span>
            </div>
          </div>

          <p class="sharing-footnote">
            {{
              t('views.dashboard.events.sharing.searchRadius', {
                value: formatDistance(suggestion.stationSearchRadiusMeters),
              })
            }}
          </p>
        </template>
      </div>

      <div v-if="showMap && getMapEmbedUrl(primaryStation)" class="sharing-map-shell">
        <iframe
          class="sharing-map"
          :src="getMapEmbedUrl(primaryStation) ?? undefined"
          :title="t('views.dashboard.events.sharing.title')"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sharing-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
}

.sharing-card--warning {
  border-color: rgba(217, 119, 6, 0.22);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(255, 247, 237, 0.96));
}

.sharing-card--success {
  border-color: rgba(22, 163, 74, 0.2);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.98), rgba(240, 249, 255, 0.96));
}

.sharing-card--compact {
  padding: 12px;
}

.sharing-card-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 12px;
  align-items: stretch;
}

.sharing-card-body--compact {
  grid-template-columns: minmax(0, 1fr);
}

.sharing-copy-block {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.sharing-card-header,
.sharing-compact-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sharing-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sharing-meta {
  display: grid;
  gap: 4px;
  text-align: right;
}

.sharing-meta--compact {
  justify-items: end;
}

.sharing-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sharing-pill--preferred {
  background: rgba(254, 249, 195, 0.92);
  border-color: rgba(202, 138, 4, 0.22);
}

.sharing-title,
.sharing-label,
.sharing-distance,
.sharing-duration,
.sharing-copy,
.sharing-footnote,
.sharing-column span,
.sharing-column strong {
  color: #111827;
}

.sharing-title {
  display: block;
  font-size: 0.95rem;
}

.sharing-distance,
.sharing-duration,
.sharing-copy,
.sharing-footnote,
.sharing-column span,
.sharing-column strong {
  font-size: 0.84rem;
}

.sharing-copy,
.sharing-footnote {
  margin: 0;
  color: #4b5563;
}

.sharing-compact-toggle {
  display: grid;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.sharing-compact-journey {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1fr auto 1fr minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.sharing-compact-node {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  color: #475569;
}

.sharing-compact-node--start {
  text-align: right;
}

.sharing-compact-node--target {
  color: #065f46;
}

.sharing-compact-rail {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.55), rgba(16, 185, 129, 0.9));
}

.sharing-compact-bike {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(236, 253, 245, 0.96);
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.15);
  font-size: 0.95rem;
}

.sharing-compact-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.sharing-expand-indicator {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  font-size: 0.74rem;
  font-weight: 700;
}

.sharing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sharing-column {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.sharing-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.sharing-empty {
  color: #6b7280;
}

.sharing-map-shell {
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.82);
}

.sharing-map {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 180px;
  border: 0;
}

@media (max-width: 720px) {
  .sharing-card-body,
  .sharing-card-header,
  .sharing-grid,
  .sharing-compact-header,
  .sharing-compact-journey {
    grid-template-columns: minmax(0, 1fr);
  }

  .sharing-card-header,
  .sharing-compact-header,
  .sharing-compact-footer {
    flex-direction: column;
  }

  .sharing-meta,
  .sharing-meta--compact,
  .sharing-compact-node--start {
    text-align: left;
    justify-items: start;
  }

  .sharing-compact-journey {
    gap: 10px;
  }

  .sharing-map {
    min-height: 160px;
  }
}
</style>
