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


# typical issues

## describe or it are not recognized
- Wallaby: check that `globals: true` is set in the test configuration (see `vitest.config.ts`)
- tslint: check that test-file pattern is defined as includes in the test configuration (see `vitest.config.ts`, `tsconfig.vitest.json`, `eslint.config.ts`), for example `src/**/*.spec.ts` and `src/**/*.test.ts`
- define in `env.d.ts`an include called `/// <reference types="vitest/globals" />` to make the globals available in the editor

## ReferenceError: document is not defined
* include `// @vitest-environment jsdom` at the top of the test file to use the `jsdom` environment for that test file ( avoid type of `//@` instead of `// @`)

## TypeError: Invalid value used as weak map key
- for dynamic types you need to use PropType

```
props: {
  text: { type: String as PropType<string | null>, default: null },
}
```


## SyntaxError: Need to install with app.use function
- define if needed the i18n-plugin in globals
```
 const wrapper = mount(Chip, {
            props: {
                text: '5 min',
                type: 'connection',
            },
            global: {
                plugins: [
                    createI18n({
                        legacy: false,
                        locale: 'de',
                        messages: {},
                    }),
                ],
            },
        });
```