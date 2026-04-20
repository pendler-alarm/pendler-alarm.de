# Project AGENTS.md

* working language: English
* keep docs of how-tos and Agents.md in sync, but Agents.md should be more concise and focused on the agents themselves, while how-tos can provide more detailed instructions and examples

## Testing
* use jsdom just if needed, otherwise use node environment for tests
* keep tests inside component folders, for example `src/components/<ComponentName>/<ComponentName>.spec.ts`

## Component Structure
- Use a component folder for every standalone component.
- Keep the main files side by side inside the component folder.
- Follow this structure for new or refactored components:

```text
src/components/<ComponentName>/
  <ComponentName>.vue
  <ComponentName>.d.ts
  <ComponentName>.ts
  <ComponentName>.css
  <ComponentName>.spec.ts
```

## Rules
- Prefer small, standalone components.
- Keep template, logic, and styles split into dedicated files when the component is more than a trivial inline case.
- Name the folder and the main files identically.
- Update imports to the new component path when moving an existing component.
- Keep tests inside the component folder as `<ComponentName>.spec.ts`.

## Example
- `SvgIcon` is the reference structure:

```text
src/components/SvgIcon/
  SvgIcon.vue
  SvgIcon.d.ts
  SvgIcon.ts
  SvgIcon.css
  SvgIcon.spec.ts
```