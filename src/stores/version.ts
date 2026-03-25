import { getDefaultReleaseMeta } from '../lib/release-meta';

export default {
  state: {
    version: getDefaultReleaseMeta().appVersion,
  },

  getters: {
    appVersion: (state: { version: string }) => state.version,
  },
};
