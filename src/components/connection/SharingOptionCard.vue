<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SharingStation, SharingSuggestion } from '@/features/sharing/sharing-service';
import { formatConnectionDuration } from '@/components/connection/connection-utils';
import SharingJourneyDetails from '@/components/connection/SharingJourneyDetails.vue';

const props = withDefaults(defineProps<{
  suggestion: SharingSuggestion;
  compact?: boolean;
}>(), {
  compact: false,
});

const { t } = useI18n();
const averageBikeMetersPerMinute = 250;

const availabilityVariant = computed<'success' | 'warning'>(() =>
  props.suggestion.originStation && props.suggestion.destinationStation ? 'success' : 'warning',
);

const primaryStation = computed<SharingStation | null>(() =>
  props.suggestion.originStation ?? props.suggestion.destinationStation ?? null,
);

const estimatedRideDuration = computed(() => {
  const durationMinutes = Math.max(1, Math.round(props.suggestion.tripDistanceMeters / averageBikeMetersPerMinute));
  return formatConnectionDuration(durationMinutes);
});

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
</script>

<template>
  <section class="sharing-card" :class="[
    `sharing-card--${availabilityVariant}`,
    { 'sharing-card--compact': compact },
  ]">
    <div class="sharing-card-body">
      <div class="sharing-copy-block">
        <div class="sharing-card-header">
          <div>
            <span class="sharing-pill">🚲 {{ suggestion.providerLabel }}</span>
            <strong class="sharing-title">{{ t('views.dashboard.events.sharing.title') }}</strong>
          </div>
          <div class="sharing-meta">
            <span class="sharing-distance">
              {{ t('views.dashboard.events.sharing.tripDistance', { value: formatDistance(suggestion.tripDistanceMeters) }) }}
            </span>
            <span class="sharing-duration">
              {{ t('views.dashboard.events.sharing.estimatedDuration', { value: estimatedRideDuration }) }}
            </span>
          </div>
        </div>

        <p class="sharing-copy">
          {{
            t('views.dashboard.events.sharing.withinThreshold', {
              current: formatDistance(suggestion.tripDistanceMeters),
              max: formatDistance(suggestion.maxTripDistanceMeters),
            })
          }}
        </p>

        <SharingJourneyDetails :suggestion="suggestion" />

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
      </div>

      <div v-if="getMapEmbedUrl(primaryStation)" class="sharing-map-shell">
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

.sharing-copy-block {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.sharing-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sharing-meta {
  display: grid;
  gap: 4px;
  text-align: right;
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
  .sharing-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sharing-card-header {
    flex-direction: column;
  }

  .sharing-meta {
    text-align: left;
  }

  .sharing-map {
    min-height: 160px;
  }
}
</style>
