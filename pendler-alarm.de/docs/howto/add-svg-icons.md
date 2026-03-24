# Add a new SVG icon

1. Add the SVG file to `src/assets/svg/`
2. Use the name of the file (without the `.svg` extension) as the `name` prop of `SvgIcon`:

```vue
<template>
  <SvgIcon name="my-icon" />
</template>
```

3. If you want to customize the size or color of the icon, you can use CSS:

```vue
<template>
  <SvgIcon name="my-icon" dimensions="24" class="my-icon" />
</template>
```
