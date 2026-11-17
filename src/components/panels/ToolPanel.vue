<template lang="pug">
    .right-panel
        ScrollPanel(class="h-full")
            .panel-title
                slot(name="title")
            .panel-content
                slot(name="content")
</template>

<script setup lang="ts">
import { useThemeCssVariables } from '#root/utils/themeCssVariables'

useThemeCssVariables('scrollpanel')
useThemeCssVariables('card')
</script>

<style scoped>
.right-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--p-card-background);
    color: var(--p-card-color);
    padding: var(--p-card-body-padding);
    gap: var(--p-card-caption-gap);
}

.panel-title {
    font-size: var(--p-card-title-font-size);
    font-weight: var(--p-card-title-font-weight);
}

.panel-content {
    flex: 1;
}

/* Always show the scrollbar (PrimeVue only shows it on hover) so it's obvious there's more
   content. It's still hidden (via `.p-scrollpanel-hidden`) when the content fits. */
:deep(.p-scrollpanel-bar) {
    opacity: 1;
}
</style>
