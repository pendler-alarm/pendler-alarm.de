import { GOOGLE_CALENDAR_SCOPE } from '@/utils/constants/api';

export const en = {
  app: {
    footer: {
      version: 'Version',
      language: 'Language',
    },
    locale: {
      de: 'DE',
      en: 'EN',
    },
  },
  auth: {
    google: {
      status: {
        notConfigured: 'Not configured',
        active: 'Calendar access active',
        loading: 'Google OAuth running',
        error: 'Error',
        ready: 'Ready',
      },
      title: {
        login: 'Google Calendar Login',
        status: 'Google Calendar Status',
      },
      description: {
        login: 'Sign in with Google and grant the app access to your calendar.',
        status: 'Access to your Google Calendar is active for the dashboard.',
      },
      action: {
        opening: 'Opening Google OAuth',
        connect: 'Connect Google Calendar',
        logout: 'Sign out',
      },
      message: {
        missingClientId: 'Add `VITE_GOOGLE_CLIENT_ID` to `.env` so login becomes available.',
        accessActive: 'OAuth access for Google Calendar is active.',
        scope: `Scope: "${GOOGLE_CALENDAR_SCOPE}"`,
      },
      error: {
        missingClientId: 'VITE_GOOGLE_CLIENT_ID is missing in the .env file.',
        scriptLoad: 'Google Identity script could not be loaded.',
        oauthApiUnavailable: 'Google OAuth API is not available.',
        noAccessToken: 'Google OAuth did not return an access token.',
        initFailed: 'Google login could not be initialized.',
      },
    },
  },
  calendar: {
    event: {
      noStartTime: 'No start time',
      untitled: 'Untitled',
    },
    error: {
      loadFailed: 'Calendar events could not be loaded: {status}',
      motisFailed: 'MOTIS request failed: {status}',
      locationUnavailable: 'Current browser location is not available.',
      locationPermissionDenied: 'Location access was denied.',
      locationTimeout: 'Location lookup timed out.',
      locationUnknown: 'Location could not be determined.',
    },
    connection: {
      loadFailed: 'Connection could not be loaded: {status}',
      errorFallback: 'Connection could not be loaded.',
      destinationMissing: 'No event location available.',
      destinationUnavailable: 'Event location could not be resolved to coordinates.',
      originUnavailable: 'Current starting point is not available.',
      eventStartUnavailable: 'An exact route cannot be calculated for all-day events.',
      noneFound: 'No matching connection was found for this event.',
      stopUnknown: 'Unknown stop',
      timeUnknown: 'Unknown time',
      modeUnknown: 'Unknown mode',
    },
  },
  releaseMeta: {
    error: {
      fetchFailed: 'Release metadata could not be loaded: {status}',
    },
  },
  views: {
    home: {
      title: 'pendler-alarm.de',
      description: 'Your calendar between platform and everyday life.',
    },
    dashboard: {
      hero: {
        subTitle: 'Dashboard',
        title: 'Calendar connected',
        description: 'You are signed in and can now access the protected dashboard area.',
      },
      events: {
        subTitle: 'Google Calendar',
        title: 'Your next 3 events',
        description: 'The list is loaded from your primary Google Calendar and enriched with MOTIS location and routing data.',
        loading: 'Loading events...',
        empty: 'No upcoming events found.',
        errorFallback: 'Calendar events could not be loaded.',
        currentLocation: {
          title: '🏠 Your current starting point',
        },
        connection: {
          title: '🚆 Matching connection',
          loading: 'Loading connection...',
          leaveAt: 'Leave at {time}',
          onTime: 'On time',
          delayed: 'Delayed',
          duration: 'Travel: {value}',
          transfers: 'Transfers: {count}',
          buffer: '{count} min until the event',
          arrivesTooLate: '{count} min after the event starts',
          earlierOptions: '1-2 earlier connections',
          updatedAt: 'Updated {time}',
          showDetails: 'Show details',
          hideDetails: 'Hide details',
        },
        debug: {
          summary: 'API Debug',
          googleCalendar: 'Google Calendar calls',
          motis: 'MOTIS calls',
          lastRefresh: 'Last refresh',
          openConnections: 'Open connections: {count}',
        },
      },
    },
    release: {
      hero: {
        subTitle: 'Builds and changes',
        title: 'Release history',
        description: 'Here you can see published versions and the changes included in them.',
      },
      states: {
        status: 'Status',
        loading: {
          title: 'Preparing release history',
          description: 'The data is generated on startup or during build and will appear here shortly.',
        },
        error: {
          title: 'Release history is currently unavailable',
          description: 'Release data could not be loaded. It will be generated again on the next startup or build.',
        },
        empty: {
          title: 'No releases available yet',
          description: 'As soon as Git tags exist, versions will appear automatically in this view.',
        },
      },
    },
    about: {
      title: 'This is the about page',
    },
    test: {
      title: 'Test view',
    },
  },
  components: {
    dashboard: {
      placeholder: 'Dashboard placeholder',
    },
  },
} as const;
