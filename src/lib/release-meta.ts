export type ReleaseSection = {
  version: string;
  date: string;
  changes: string[];
};

export type ReleaseMeta = {
  appVersion: string;
  releaseSections: ReleaseSection[];
};

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

export const getDefaultReleaseMeta = (): ReleaseMeta => fallbackMeta;

export const fetchReleaseMeta = async (): Promise<ReleaseMeta> => {
  const response = await fetch('/api/releases.json', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch release metadata: ${response.status}`);
  }

  const meta = (await response.json()) as ReleaseMeta;
  return normalizeReleaseMeta(meta);
};
