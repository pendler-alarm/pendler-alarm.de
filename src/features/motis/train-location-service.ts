import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import { TRAIN_ISP_CHECK_API_CHECK } from '@/utils/constants/api';
import type { ResolvedLocation } from '@/features/motis/location-service';

const TRAIN_ISP_CHECK_URL = TRAIN_ISP_CHECK_API_CHECK;
const REQUEST_TIMEOUT_MS = 4_000;

type BrowserNetworkInformation = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

type TrainIspCheckResponse = {
  ip?: string;
  isp?: string;
  isTrainLikely?: boolean;
};

export type TrainIspCheckContext = {
  reachable: boolean;
  isTrainLikely: boolean;
  ip: string | null;
  isp: string | null;
  error: string | null;
};

export type TrainLocationContext = {
  isProbablyOnTrain: boolean;
  icePortalReachable: boolean;
  trainIspReachable: boolean;
  trainIspLikely: boolean;
  trainIspProvider: string | null;
  trainIspIp: string | null;
  resolvedLocation: ResolvedLocation | null;
  speedKmh: number | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  roundTripTimeMs: number | null;
  trainType: string | null;
  trainNumber: string | null;
  finalStationName: string | null;
  internetQuality: string | null;
  connectivityState: string | null;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getBrowserNetworkInformation = (): BrowserNetworkInformation | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const connection = (navigator as Navigator & {
    connection?: BrowserNetworkInformation;
    mozConnection?: BrowserNetworkInformation;
    webkitConnection?: BrowserNetworkInformation;
  }).connection
    ?? (navigator as Navigator & { mozConnection?: BrowserNetworkInformation }).mozConnection
    ?? (navigator as Navigator & { webkitConnection?: BrowserNetworkInformation }).webkitConnection;

  return connection ?? null;
};

const fetchJsonWithTimeout = async <T>(url: string): Promise<{ response: Response; json: T }> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const json = await response.json() as T;
    return { response, json };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const checkTrainIspStatus = async (): Promise<TrainIspCheckContext> => {
  const requestId = startApiRequest('motis', 'train-isp-check', {
    method: 'GET',
    url: TRAIN_ISP_CHECK_URL,
  });

  try {
    const { response, json } = await fetchJsonWithTimeout<TrainIspCheckResponse>(TRAIN_ISP_CHECK_URL);

    finishApiRequest(requestId, response.ok ? 'success' : 'error', response.status, {
      responseJson: json,
    });

    if (!response.ok) {
      throw new Error(`train-isp-check-${String(response.status)}`);
    }

    return {
      reachable: true,
      isTrainLikely: json.isTrainLikely === true,
      ip: json.ip?.trim() || null,
      isp: json.isp?.trim() || null,
      error: null,
    };
  } catch (error) {
    finishApiRequest(requestId, 'error', null, {
      errorKind: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network',
      errorMessage: error instanceof Error ? error.message : 'train-isp-check-error',
    });

    return {
      reachable: false,
      isTrainLikely: false,
      ip: null,
      isp: null,
      error: error instanceof Error ? error.message : 'train-isp-check-error',
    };
  }
};

export const detectTrainLocation = async (): Promise<TrainLocationContext> => {
  const network = getBrowserNetworkInformation();
  const trainIspStatus = await checkTrainIspStatus();

  return {
    isProbablyOnTrain: trainIspStatus.reachable && trainIspStatus.isTrainLikely,
    icePortalReachable: false,
    trainIspReachable: trainIspStatus.reachable,
    trainIspLikely: trainIspStatus.isTrainLikely,
    trainIspProvider: trainIspStatus.isp,
    trainIspIp: trainIspStatus.ip,
    resolvedLocation: null,
    speedKmh: null,
    connectionType: network?.type ?? null,
    effectiveType: network?.effectiveType ?? null,
    downlinkMbps: isFiniteNumber(network?.downlink) ? network.downlink : null,
    roundTripTimeMs: isFiniteNumber(network?.rtt) ? network.rtt : null,
    trainType: null,
    trainNumber: null,
    finalStationName: null,
    internetQuality: null,
    connectivityState: null,
  };
};
