<template lang="pug">
    Card.top-popover(
        :class="{ 'no-gap': !hasTitle, showtip: showtip }"
        :data-tip-left="pointerPos"
    )
        template(#title)
            div(v-if="hasTitle")
                slot(name="title")
        template(#content)
            slot(name="content")
</template>

<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '#root/utils/themeCssVariables'

useThemeCssVariables('card')

const slots = vue.useSlots()

const hasTitle = vue.computed(() => !!slots.title);

const pointerPos = vue.inject<vue.DeepReadonly<number>>('pointerPos')

// Don't show a wrongly positioned tooltip in Firefox
const showtip = vue.ref()
showtip.value = true //CSS.supports("x: attr(x type(*))")
</script>

<style>
.editor-pane .p-card.no-gap > .p-card-body {
    gap: 0px !important;
}
</style>

<style scoped>
.top-popover {
    position: absolute;
    margin-top: 0;
    z-index: 100;
    border: 1px solid grey;
}

.top-popover.showtip::before {
    display: inline-block;
    position: absolute;
    height: 16px;
    width: 20px;
    top: -16px;
    left: attr(data-tip-left px);
    z-index: 99;
}

.top-popover.showtip::before {
    content: url("./icons/TopPanelArrowLight.svg");
}

.celldl-dark-mode .top-popover.showtip::before {
    content: url("./icons/TopPanelArrowDark.svg");
}

</style>
