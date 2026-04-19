# 🧩 Component structure

Use a folder-based structure for standalone components.

## ✅ Target structure

```text
src/components/<ComponentName>/
  <ComponentName>.vue
  <ComponentName>.ts
  <ComponentName>.css
  <ComponentName>.spec.ts
```

## 📌 Rules

- Use one folder per component.
- Keep folder name and main file names identical.
- Split template, logic, and styles into separate files.
- When refactoring an existing component, update all imports to the new path.
- Keep tests in the component folder as `<ComponentName>.spec.ts`.
- Use `SvgIcon` as the reference example.

## 🧪 Example

```text
src/components/SvgIcon/
  SvgIcon.vue
  SvgIcon.ts
  SvgIcon.css
  SvgIcon.spec.ts
```
