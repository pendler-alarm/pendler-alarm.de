<template>
  <div v-if="props.transferLabel" class="transfer-card" :class="`transfer-card--${props.transferTone}`">
    <p class="transfer-card__title">{{ props.transferLabel }}</p>
    <p v-if="props.transferWalkSummary" class="transfer-card__summary">
      {{ props.transferWalkSummary }}
    </p>
    <div class="transfer-card__extras">
      <Chip :text="props.hasStationChange ? props.transferStationChangeLabel ?? undefined : undefined" emoji="🚶"
        type="connection" />
      <ChipItem label="transferDistance" :label-props="{ value: props.transferDistanceLabel }" emoji="📏"
        type="connection" />
      <Chip :text="props.transferFeasibilityLabel ?? undefined"
        :type="props.transferTone === 'neutral' ? 'connection' : `connection-${props.transferTone}`" />
      <ChipItem v-if="props.missedProbabilityLabel" label="transferMissedShort"
        :label-props="{ value: props.missedProbabilityLabel }" type="connection" />
      <Chip :link="props.transferRouteLink ?? undefined" type="connection-link" />
      <Chip :link="props.incomingStationLink ?? undefined" type="connection-link" />
      <Chip :link="props.outgoingWalkStationLink ?? undefined" type="connection-link" />
    </div>
  </div>
</template>

<script src="./TransferCard.ts" lang="ts"></script>
<style scoped src="./TransferCard.css"></style>
