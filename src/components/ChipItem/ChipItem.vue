<template>
  <Chip :type="chipType" :root-attributes="rootAttributes" :root-class-name="rootClassName" :css="css">
    <template #custom>
      <Item :emoji="emoji" :label="label" :label-style="labelStyle" :bold="bold" :seperator="separator" :link="link"
        :label-props="labelProps" :show="show" :type="type" :value="text ?? value" />
    </template>
  </Chip>
</template>

<script src="./ChipItem.ts" lang="ts"></script>
