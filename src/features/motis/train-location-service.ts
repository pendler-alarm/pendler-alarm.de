import { CD_CARRIER_LOGO_ICON, CD_CARRIER_NAME, fetchCdTrainContext, isCdWifiIsp } from '@/features/motis/cd-train-service';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import { TRAIN_ISP_CHECK_API_CHECK } from '@/utils/constants/api';
import type { Coordinates, ResolvedLocation } from '@/features/motis/location-service';

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
  error: string | null;
  ip: string | null;
  isCdWifi: boolean;
  isTrainLikely: boolean;
  isp: string | null;
  reachable: boolean;
};

export type TrainLocationContext = {
  carrierLogoIcon: string | null;
  carrierName: string | null;
  connectionType: string | null;
  connectivityState: string | null;
  downlinkMbps: number | null;
  effectiveType: string | null;
  finalStationName: string | null;
  icePortalReachable: boolean;
  internetQuality: string | null;
  isProbablyOnTrain: boolean;
  nextStationCoordinates: Coordinates | null;
  nextStationName: string | null;
  originStationName: string | null;
  resolvedLocation: ResolvedLocation | null;
  roundTripTimeMs: number | null;
  speedKmh: number | null;
  trainIspIp: string | null;
  trainIspLikely: boolean;
  trainIspProvider: string | null;
  trainIspReachable: boolean;
  trainNumber: string | null;
  trainType: string | null;
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
      error: null,
      ip: json.ip?.trim() || null,
      isCdWifi: isCdWifiIsp(json.isp),
      isTrainLikely: json.isTrainLikely === true,
      isp: json.isp?.trim() || null,
      reachable: true,
    };
  } catch (error) {
    finishApiRequest(requestId, 'error', null, {
      errorKind: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network',
      errorMessage: error instanceof Error ? error.message : 'train-isp-check-error',
    });

    return {
      error: error instanceof Error ? error.message : 'train-isp-check-error',
      ip: null,
      isCdWifi: false,
      isTrainLikely: false,
      isp: null,
      reachable: false,
    };
  }
};

export const detectTrainLocation = async (): Promise<TrainLocationContext> => {
  const network = getBrowserNetworkInformation();
  const trainIspStatus = await checkTrainIspStatus();
  const cdTrainContext = trainIspStatus.reachable && trainIspStatus.isCdWifi
    ? await fetchCdTrainContext().catch(() => null)
    : null;

  return {
    carrierLogoIcon: cdTrainContext?.carrierLogoIcon ?? (trainIspStatus.isCdWifi ? CD_CARRIER_LOGO_ICON : null),
    carrierName: cdTrainContext?.carrierName ?? (trainIspStatus.isCdWifi ? CD_CARRIER_NAME() : null),
    connectionType: network?.type ?? null,
    connectivityState: null,
    downlinkMbps: isFiniteNumber(network?.downlink) ? network.downlink : null,
    effectiveType: network?.effectiveType ?? null,
    finalStationName: cdTrainContext?.finalStationName ?? null,
    icePortalReachable: false,
    internetQuality: null,
    isProbablyOnTrain: trainIspStatus.reachable && (trainIspStatus.isTrainLikely || trainIspStatus.isCdWifi),
    nextStationCoordinates: cdTrainContext?.nextStationCoordinates ?? null,
    nextStationName: cdTrainContext?.nextStationName ?? null,
    originStationName: cdTrainContext?.originStationName ?? null,
    resolvedLocation: cdTrainContext?.resolvedLocation ?? null,
    roundTripTimeMs: isFiniteNumber(network?.rtt) ? network.rtt : null,
    speedKmh: cdTrainContext?.speedKmh ?? null,
    trainIspIp: trainIspStatus.ip,
    trainIspLikely: trainIspStatus.isTrainLikely || trainIspStatus.isCdWifi,
    trainIspProvider: trainIspStatus.isp,
    trainIspReachable: trainIspStatus.reachable,
    trainNumber: null,
    trainType: cdTrainContext?.trainName ?? null,
  };
};
