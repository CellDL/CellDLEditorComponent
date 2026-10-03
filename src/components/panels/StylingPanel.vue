<template lang="pug">
    ToolPanel
        template(#title)
            div {{ title }}
        template(#content)
            div(v-if="!properties.objectId") Please select a single element or path.
            template(v-else)
                .group(v-for="group in styleGroups")
                    FillStyle(
                        v-if="group.styling.fillStyle"
                        :fillStyle="group.styling.fillStyle"
                        @change="updateFillStyle"
                    )
                    CornerStyle(
                        v-if="group.styling.cornerStyle"
                        :cornerStyle="group.styling.cornerStyle"
                        @change="updateCornerStyle"
                    )
                    PathStyle(
                        v-if="group.styling.pathStyle"
                        :pathStyle="group.styling.pathStyle"
                        @change="updatePathStyle"
                    )
                    GapStyle(
                        v-if="group.styling.gapStyle"
                        :gapStyle="group.styling.gapStyle"
                        @change="updateGapStyle"
                    )
</template>

<script setup lang="ts">
//==============================================================================

import * as vue from 'vue'

import type { ComponentProperties, PropertyGroup } from '#root/utils/editor-types'

import CornerStyle from '../widgets/CornerStyle.vue'
import FillStyle from '../widgets/FillStyle.vue'
import GapStyle from '../widgets/GapStyle.vue'
import PathStyle from '../widgets/PathStyle.vue'

import ToolPanel from './ToolPanel.vue'

//==============================================================================

const props = defineProps<{
    title: string
    toolId: string
}>()

const emit = defineEmits(['style-event'])

//==============================================================================

const properties = vue.inject<vue.Ref<ComponentProperties>>(`${props.toolId}-componentProperties`)

const disabled = vue.ref<boolean>(properties?.value ? !properties.value.objectId : true)
const styleGroups = vue.ref<PropertyGroup[]>([])

// Need to make sure panel is closed when button is deactivated
vue.watch(
    () => properties?.value,
    (newValue) => {
        const visible = !!newValue?.objectId
        if (visible) {
            styleGroups.value = newValue.groups
        }
        disabled.value = !visible
    },
    { deep: true }
)

//==============================================================================

function updateCornerStyle(cornerStyle: string) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, { cornerStyle })
    })
}

function updateFillStyle(fillStyle: string) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, { fillStyle })
    })
}

function updateGapStyle(gapStyle: string) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, { gapStyle })
    })
}

function updatePathStyle(pathStyle: string) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, { pathStyle })
    })
}

//==============================================================================
</script>
