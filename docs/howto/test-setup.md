# 🧪 Test setup

## Überblick

Das Projekt verwendet für Unit-Tests **Vitest** statt Jest.

Gründe:
- Vitest läuft nativ mit Vite und Vue 3.
- Komponenten wie `SvgIcon` nutzen `import.meta.glob`, was Vite-spezifisch ist.
- Dadurch funktioniert das bestehende Komponenten-Setup direkt ohne zusätzliche Jest-Transformer.

## Relevante Dateien

- `package.json`: Standard-Testbefehl `npm test`
- `vitest.config.ts`: Vitest-Laufzeit und ausgeschlossene Pfade
- `tsconfig.vitest.json`: TypeScript-Setup für Testdateien
- `tsconfig.app.json`: schließt Testdateien aus der App-Typisierung aus

## Befehle

```bash
npm test
npm run test:unit
```

Beide Befehle verwenden das Vitest-Setup.

## TypeScript-Setup für Tests

Test-Globals wie `describe`, `it` und `expect` kommen aus `vitest/globals`.

Zusätzlich ist ein expliziter Import aus `vitest` in Specs der robusteste Weg, damit Editor, `vue-tsc --build` und Testlauf dasselbe Verhalten sehen.

Wichtig:
- Testdateien werden über `tsconfig.vitest.json` typisiert.
- `tsconfig.app.json` schließt `*.spec.ts`, `*.test.ts` und `__tests__` aus.
- So bekommen App-Dateien keine Test-Globals und Testdateien keine falschen App-Types.

## Bekannte Ausnahme

Die Datei `src/components/__tests__/HelloWorld.spec.ts` ist aktuell vom Testlauf ausgeschlossen, weil die referenzierte `HelloWorld.vue` im Projekt nicht mehr existiert.

Wenn der Test wieder gebraucht wird:
1. die Komponente wieder anlegen oder den Test an eine bestehende Komponente anpassen
2. den Ausschluss in `vitest.config.ts` entfernen
