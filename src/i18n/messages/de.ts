import { GOOGLE_CALENDAR_SCOPE } from '@/utils/constants/api';

export const de = {
  app: {
    footer: {
      version: 'Version',
      language: 'Sprache',
    },
    locale: {
      de: 'DE',
      en: 'EN',
    },
  },
  auth: {
    google: {
      status: {
        notConfigured: 'Nicht konfiguriert',
        active: 'Calendar Zugriff aktiv',
        loading: 'Google OAuth lauft',
        error: 'Fehler',
        ready: 'Bereit',
      },
      title: {
        login: 'Google Calendar Login',
        status: 'Google Calendar Status',
      },
      description: {
        login: 'Melde dich mit Google an und gib der App Zugriff auf deinen Kalender.',
        status: 'Der Zugriff auf deinen Google Kalender ist fur das Dashboard aktiv.',
      },
      action: {
        opening: 'Google OAuth wird geoffnet',
        connect: 'Mit Google Calendar verbinden',
        logout: 'Abmelden',
      },
      message: {
        missingClientId: 'Trage `VITE_GOOGLE_CLIENT_ID` in der `.env` ein, damit der Login verfugbar ist.',
        accessActive: 'Der OAuth-Zugriff fur Google Calendar ist aktiv.',
        scope: `Scope: "${GOOGLE_CALENDAR_SCOPE}"`,
      },
      error: {
        missingClientId: 'VITE_GOOGLE_CLIENT_ID fehlt in der .env.',
        scriptLoad: 'Google Identity Script konnte nicht geladen werden.',
        oauthApiUnavailable: 'Google OAuth API ist nicht verfugbar.',
        noAccessToken: 'Google OAuth hat keinen Access Token geliefert.',
        initFailed: 'Google Login konnte nicht initialisiert werden.',
      },
    },
  },
  calendar: {
    event: {
      noStartTime: 'Kein Startzeitpunkt',
      untitled: 'Ohne Titel',
    },
    error: {
      loadFailed: 'Kalendertermine konnten nicht geladen werden: {status}',
      motisFailed: 'MOTIS-Anfrage fehlgeschlagen: {status}',
      locationUnavailable: 'Aktueller Standort ist im Browser nicht verfugbar.',
      locationPermissionDenied: 'Standortfreigabe wurde verweigert.',
      locationTimeout: 'Standort konnte nicht rechtzeitig ermittelt werden.',
      locationUnknown: 'Standort konnte nicht bestimmt werden.',
    },
    connection: {
      loadFailed: 'Verbindung konnte nicht geladen werden: {status}',
      errorFallback: 'Verbindung konnte nicht geladen werden.',
      destinationMissing: 'Kein Event-Ort vorhanden.',
      destinationUnavailable: 'Event-Ort konnte nicht in Koordinaten aufgelost werden.',
      originUnavailable: 'Aktueller Startpunkt ist nicht verfugbar.',
      eventStartUnavailable: 'Fur Ganztagstermine kann keine genaue Verbindung berechnet werden.',
      noneFound: 'Keine passende Verbindung fur diesen Termin gefunden.',
      stopUnknown: 'Unbekannte Haltestelle',
      timeUnknown: 'Zeit unbekannt',
      modeUnknown: 'Unbekanntes Verkehrsmittel',
    },
  },
  releaseMeta: {
    error: {
      fetchFailed: 'Release-Metadaten konnten nicht geladen werden: {status}',
    },
  },
  views: {
    home: {
      title: 'pendler-alarm.de',
      description: 'Dein Kalender zwischen Gleis und Alltag.',
    },
    dashboard: {
      hero: {
        subTitle: 'Dashboard',
        title: 'Kalender verbunden',
        description: 'Du bist angemeldet und kannst jetzt auf den geschutzten Dashboard-Bereich wechseln.',
      },
      events: {
        subTitle: 'Google Calendar',
        title: 'Deine nachsten 3 Termine',
        description: 'Die Liste wird aus deinem primaren Google Kalender geladen und mit MOTIS-Orts- und Verbindungsdaten angereichert.',
        loading: 'Termine werden geladen...',
        empty: 'Keine anstehenden Termine gefunden.',
        errorFallback: 'Kalendertermine konnten nicht geladen werden.',
        currentLocation: {
          title: '🏠 Dein aktueller Startpunkt',
        },
        connection: {
          title: '🚆 Passende Verbindung',
          loading: 'Verbindung wird geladen...',
          leaveAt: 'Losgehen um {time}',
          onTime: 'Pünktlich',
          delayed: 'Verspätet',
          duration: 'Fahrt: {value}',
          transfers: 'Umstiege: {count}',
          buffer: '{count} Min. bis zum Termin',
          arrivesTooLate: '{count} Min. nach Terminbeginn',
          earlierOptions: '1-2 frühere Verbindungen',
          updatedAt: 'Aktualisiert {time}',
          showDetails: 'Details anzeigen',
          hideDetails: 'Details ausblenden',
        },
        debug: {
          summary: 'API Debug',
          googleCalendar: 'Google Calendar Aufrufe',
          motis: 'MOTIS Aufrufe',
          lastRefresh: 'Letzte Aktualisierung',
          openConnections: 'Offene Verbindungen: {count}',
        },
      },
    },
    release: {
      hero: {
        subTitle: 'Builds und Changes',
        title: 'Release History',
        description: 'Hier siehst du die veroffentlichten Versionen und die enthaltenen Anderungen.',
      },
      states: {
        status: 'Status',
        loading: {
          title: 'Release-Historie wird vorbereitet',
          description: 'Die Daten werden beim Start oder Build generiert und stehen gleich hier bereit.',
        },
        error: {
          title: 'Release-Historie aktuell nicht verfugbar',
          description: 'Es konnten keine Release-Daten geladen werden. Beim nachsten Start oder Build werden sie neu erzeugt.',
        },
        empty: {
          title: 'Noch keine Releases vorhanden',
          description: 'Sobald Git-Tags vorhanden sind, erscheinen die Versionen automatisch in dieser Ansicht.',
        },
      },
    },
    about: {
      title: 'Das ist die About-Seite',
    },
    test: {
      title: 'Testansicht',
    },
  },
  components: {
    dashboard: {
      placeholder: 'Dashboard Platzhalter',
    },
  },
} as const;
