# add a new view

To create a new view, you can follow these steps:

1. Create a new `.vue` file in the `src/views` directory. Either directly in the `views` directory or in a subdirectory. For example, you can create `src/views/test/TestView.vue`.

2. Add the following code to your new view file:

```vue
<template>
  <div class="about">
    <h1>TestView</h1>
  </div>
</template>
```

3. Now you can navigate to this view by extending the router. Open `src/router/routes.ts` and add a new route for your view:

```typescript
{
    name: 'test',
    view: 'TestView.vue',
}
```

It automatically assumes that the view is located in the `src/views` directory and the path is `/test`. If you have created a subdirectory and non-generic path, you can specify as follows:

```typescript
{
    name: 'test',
    path: '/other/folder',
    view: 'test/TestView.vue',
}
```
