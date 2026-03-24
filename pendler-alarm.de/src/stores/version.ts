import { appVersion } from '../generated/release-meta'

export default {
  state: {
    version: appVersion,
  },

  getters: {
    appVersion: (state: { version: string }) => state.version,
  },
}
