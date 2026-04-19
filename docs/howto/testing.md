# testing setup

## Overview

This project currently uses the following for testing:

- `Node 22` as the runtime
- `Vitest` for unit tests
- `Wallaby` for fast feedback during development
- `node` as the current default test environment (instead of `jsdom`)

## Node version

`Node 22` should be used for local development and test runs.

- recommended: `Node >= 22.12.0`
- basis: `package.json` defines `"node": ">=22.12.0"`

Before running tests, check that `node --version` shows `22.x.x` or higher.

## Test commands

* Run tests once: `npm run test`
* Run unit tests: `npm run test:unit`

## Current test environment

The current default is `node`.

- the global test configuration currently uses `node`
- this is the safe default for DOM-heavy Vue tests and component tests
- simple logic or utility tests often do not need `jsdom`

## Partial use of jsdom

If a test explicitly depends on DOM APIs, that should be visible in the test file.

Example for a test file with an explicit environment:

```ts
// @vitest-environment jsdom
```

This is especially useful for tests using:

- `mount(...)`
- `window`
- `localStorage`
- `document`
- `HTMLElement`
- browser events or DOM rendering

## Target structure

Tests should live directly inside component structures, for example:

```text
src/components/<component>/
  - <component>.vue
  - <component>.spec.ts
```

Benefits:

- tests stay closer to the implemented component
- refactorings become easier
- structure and responsibility remain clear

## Notes for new tests

- new component tests should follow the component structure
- DOM-heavy tests may use `jsdom`
- pure logic should be tested without unnecessary browser dependencies where possible
- when older tests are reworked, the structure should move step by step toward component-local tests

## Wallaby

With `Wallaby`, tests can be run quickly and interactively during development.
A prerequisite is that `Wallaby` is installed in the IDE (for example VS Code), that the Wallaby configuration is enabled in the project, and that the project is open source and publicly accessible for Wallaby's free usage.

`Wallaby` uses the existing project test configuration.

Important:

- `jsdom` as the default can noticeably slow down Wallaby runs
- for component-local Vue tests, the current default is acceptable for now
- later optimizations should only happen once the test structure is closer to the components
