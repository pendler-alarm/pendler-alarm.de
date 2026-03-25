import {
  releaseMeta as generatedReleaseMeta,
  type ReleaseMeta,
  type ReleaseSection,
} from '@/generated/release-meta';

const fallbackMeta: ReleaseMeta = {
  appVersion: 'v0.0.0',
  releaseSections: [],
};

const normalizeReleaseMeta = (meta: ReleaseMeta | null | undefined): ReleaseMeta => {
  if (!meta) {
    return fallbackMeta;
  }

  return {
    appVersion: meta.appVersion || fallbackMeta.appVersion,
    releaseSections: Array.isArray(meta.releaseSections) ? meta.releaseSections : fallbackMeta.releaseSections,
  };
};

export const getDefaultReleaseMeta = (): ReleaseMeta => normalizeReleaseMeta(generatedReleaseMeta);

export const fetchReleaseMeta = async (): Promise<ReleaseMeta> => {
  return normalizeReleaseMeta(generatedReleaseMeta);
};

export type { ReleaseMeta, ReleaseSection };
