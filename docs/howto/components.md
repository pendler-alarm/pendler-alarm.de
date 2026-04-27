# component structure

## Overview

Components should be organized as standalone folders.
The component name should match the folder name and the file name.

Example:

```text
src/components/<component>/
  - <component>.ts
  - <component>.spec.ts
  - <component>.d.ts
  - <component>.md
  - <component>.css
```

## Naming

Use the same base name for the component folder and its files.

Example:

```text
src/components/target-input/
  - target-input.ts
  - target-input.spec.ts
  - target-input.d.ts
  - target-input.css
```

## Structure rules

- keep components small and focused
- avoid large files where possible
- a component should consist of its own folder and related files
- keep related logic close to the component
- keep related styles close to the component when styles are large enough to justify a separate file

## Subcomponents and domains

If a component has multiple related subparts in the same domain, use nested folders instead of many flat files.

Prefer this:

```text
target-input/
  - target-input.ts
  - parser/
    - parser.ts
  - validator/
    - validator.ts
```

Instead of this:

```text
target-input/
  - target-input.ts
  - target-input-parser.ts
  - target-input-validator.ts
```

## Types and styles

If possible:

- separate TypeScript types from logic
- keep types inside the component folder
- use `<component>.d.ts` for component-specific type files
- separate larger stylesheets from logic
- keep styles inside the component folder as `.css` files

## Testing

Tests should live directly inside the component structure.

Example:

```text
src/components/<component>/
  - <component>.vue
  - <component>.spec.ts
```

This keeps implementation and tests close together and makes refactoring easier.

## Refactoring notes

- avoid leaving empty folders or unused files behind
- refactor all affected files unless there is an explicit limitation
- if something is intentionally skipped, document why


## SAMPLE Code

helper functions
* `checkVisibility(props, key[])` - define when sth is visible
* `getLabel(type, labelKey|labelKeyShort, labelProps)` - get label from type or label key with i18n support and replace placeholders with labelProps values
* `getStyles(styles, styleConfig, extraCSS)`
* `getValue(props, optional)` - get value from defined props with support for nested keys

```vue
<template>
    <div :class="css" v-if="isVisible">
        some logic: {{ someValue }}
    </div>
</template>
<script src="./COMPONENT.ts" lang="ts"></script>
```

```typescript
export default defineComponent({
    name: 'COMPONENT',
    props: {
        css: { type: String, default: null },
        value: { type: String as PropType<string | null>, default: null },
    },
    setup(props: ItemProps) {
        const isVisible = computed(() => checkVisibility(props, ['value']));
        return {
            isVisible, // extracted logic
        };
    },
});
```