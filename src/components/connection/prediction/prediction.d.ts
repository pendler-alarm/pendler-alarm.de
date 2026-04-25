export type PredictionTone = 'good' | 'warn' | 'bad' | 'neutral';

export type PredictionContext = {
  delayPrediction?: ConnectionDelayPrediction | null;
  routeStops: RouteStopEntry[];
  t: (key: string, params?: Record<string, unknown>) => string;
};

export type ConnectionPrediction = {
  getPredictionTone: (stop: RouteStopEntry) => PredictionTone;
  getRelatedDelayCalls: (stop: RouteStopEntry) => ConnectionDelayCall[];
  getStopPredictionLabel: (stop: RouteStopEntry) => string | null;
  getStopPredictionTitle: (stop: RouteStopEntry) => string | null;
  getStopPredictionValue: (stop: RouteStopEntry) => string | null;
  getTransferAssessment: (stop: RouteStopEntry) => ConnectionTransferAssessment | null;
};

export type PROBABILITY = number;
export type $PROBABILITY = PROBABILITY | null;

export type I18N_LABEL_KEY = string;
