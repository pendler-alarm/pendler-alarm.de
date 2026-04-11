import { reactive } from 'vue';
import { checkTrainIspStatus } from '@/features/motis/train-location-service';
import { probeTrainPresenceSignals } from '@/features/motis/train-presence-probe';

export type TrainPresenceState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  isTrainLikely: boolean | null;
  isp: string | null;
  ip: string | null;
  checkedAtIso: string | null;
  error: string | null;
};

export const trainPresenceState = reactive<TrainPresenceState>({
  status: 'idle',
  isTrainLikely: null,
  isp: null,
  ip: null,
  checkedAtIso: null,
  error: null,
});

let refreshTimer: number | null = null;
let refreshPromise: Promise<void> | null = null;
let lastProbeCoordinates: { lat: number; lon: number } | null = null;
let lastNetworkFingerprint: string | null = null;

const applyTrainPresenceResult = ({
  error,
  ip,
  isTrainLikely,
  isp,
  reachable,
}: Awaited<ReturnType<typeof checkTrainIspStatus>>): void => {
  trainPresenceState.status = reachable ? 'success' : 'error';
  trainPresenceState.isTrainLikely = reachable ? isTrainLikely : null;
  trainPresenceState.isp = isp;
  trainPresenceState.ip = ip;
  trainPresenceState.checkedAtIso = new Date().toISOString();
  trainPresenceState.error = error;
};

const syncProbeSnapshot = ({
  coordinates,
  networkFingerprint,
}: {
  coordinates: { lat: number; lon: number } | null;
  networkFingerprint: string | null;
}): void => {
  lastProbeCoordinates = coordinates;
  lastNetworkFingerprint = networkFingerprint;
};

export const refreshTrainPresence = async (): Promise<void> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (trainPresenceState.checkedAtIso === null) {
    trainPresenceState.status = 'loading';
  }

  refreshPromise = (async () => {
    const probe = await probeTrainPresenceSignals({
      previousCoordinates: lastProbeCoordinates,
      previousNetworkFingerprint: lastNetworkFingerprint,
      hasPreviousIspResult: trainPresenceState.checkedAtIso !== null,
    });

    syncProbeSnapshot(probe);

    if (!probe.shouldCheckIsp) {
      return;
    }

    const result = await checkTrainIspStatus();
    applyTrainPresenceResult(result);
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const startTrainPresencePolling = (intervalMs: number): void => {
  if (typeof window === 'undefined' || refreshTimer !== null) {
    return;
  }

  void refreshTrainPresence();
  refreshTimer = window.setInterval(() => {
    void refreshTrainPresence();
  }, intervalMs);
};

export const stopTrainPresencePolling = (): void => {
  if (typeof window === 'undefined' || refreshTimer === null) {
    return;
  }

  window.clearInterval(refreshTimer);
  refreshTimer = null;
};
