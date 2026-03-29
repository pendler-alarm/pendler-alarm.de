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
    logo: 'logo',
    serviceWorker: {
      unsupported: 'Service worker unavailable',
      registering: 'Service worker starting',
      active: 'Service worker active',
      updating: 'Service worker updating',
      error: 'Service worker error',
      online: 'Online',
      offline: 'Offline',
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
        notification: {
          title: 'Notification status',
          statusPrompt: 'Browser notifications are not enabled yet.',
          statusDenied: 'Browser notifications are blocked. Please enable them in your browser settings.',
          statusGrantedBrowser: 'Browser notifications are allowed. In the installed PWA, your system settings still apply.',
          statusGrantedStandalone: 'Notifications are allowed for the PWA. If nothing is visibly shown, check your device system notification settings.',
          systemHint: 'Note: the browser and PWA can trigger notifications technically even when banners or pop-ups are suppressed by the operating system.',
        },
        connection: {
          loading: 'Loading connection...',
          leaveAt: 'Leave at {time}',
          notificationTitle: 'Leave now for {event}',
          notificationBody: 'Best connection: leave at {time}.',
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
          triggerFirstEventNotification: 'Test notification for 1st event',
          notificationTitle: 'Debug: reminder for {event}',
          notificationBody: 'Test notification triggered. Reference time: {time}.',
          feedback: {
            unsupported: 'Notifications or service workers are not supported in this browser.',
            noEvents: 'There is currently no event loaded that can be used for a test notification.',
            permissionDenied: 'Notifications are not allowed. Please enable the permission in your browser.',
            workerUnavailable: 'The service worker is not active yet. Reload the page and try again.',
            sent: 'The test notification was sent to the service worker. Waiting for confirmation.',
            displayed: 'The notification was accepted and triggered by the browser.',
            failed: 'The browser could not display the notification.',
            failedWithReason: 'The notification could not be displayed: {reason}',
          },
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
    setupPrompt: {
      eyebrow: 'Get set up',
      title: 'Install the app',
      body: 'Install Pendler Alarm. Location is requested right after that, notifications by explicit click.',
      installTitle: 'Install PWA',
      installCopy: 'Location is requested right after installation.',
      installAction: 'Install now',
      notificationTitle: 'Push notifications',
      notificationCopy: 'Enable push notifications for trip reminders.',
      notificationAction: 'Enable notifications',
      notificationRetry: 'Try again',
      notificationGranted: 'Notifications are enabled.',
      later: 'Later',
    },
    widget: {
      api: 'API',
    },
    
  },
} as const;
