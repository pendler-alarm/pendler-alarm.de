// get environment variables from .env file or from env variables set in the hosting environment
import { defineStore } from 'pinia';

export const useEnvStore = defineStore('env', {
  state: () => ({
    env: import.meta.env ? import.meta.env : process.env,
  }),
});


