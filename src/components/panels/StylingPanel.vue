<template lang="pug">
    ToolPanel
        template(#title)
            div {{ title }}
        template(#content)
            div(
                v-if="!properties.objectId"
            ) Please select a single element or path.
            template(
                v-else
            )
                .group(
                    v-for="group in expandedGroups"
                )
                    p.bold {{ group.groupId }}
                    FillStyle(
                        v-if="group.objectType === 'node'"
                        :fillStyle="group.objectStyle"
                        @change="updateNodeStyle"
                    )
                    PathStyle(
                        v-else-if="group.objectType === 'path'"
                        :pathStyle="group.objectStyle"
                        @change="updatePathStyle"
                    )
</template>
<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '#root/utils/themeCssVariables'

useThemeCssVariables('accordion')
useThemeCssVariables('accordioncontent')
useThemeCssVariables('accordioncontent')
useThemeCssVariables('accordionpanel')

import type { ComponentProperties, PropertyGroup } from '#root/utils/editor-types'

import ToolPanel from '../toolbar/ToolPanel.vue'

import FillStyle from './FillStyle.vue'
import PathStyle from './PathStyle.vue'

import type {
    FillStyling,
    PathStyling
} from '#root/utils/svgUtils'

type ExpandedPropertyGroup = PropertyGroup & {
    objectType: string
    objectStyle?: FillStyling|PathStyling
}

const props = defineProps<{
    title: string
    toolId: string
}>()

const properties = vue.inject<vue.Ref<ComponentProperties>>(`${props.toolId}-componentProperties`)

const disabled = vue.ref<boolean>(properties?.value ? !properties.value.objectId : true)
const expandedGroups = vue.ref<ExpandedPropertyGroup[]>([])

vue.watch(
    () => properties?.value,
    (newValue) => {
        const visible = !!newValue?.objectId
        if (visible) {
            setExpandededGroups(newValue.groups)
        }
        disabled.value = !visible
    },
    { deep: true }
)

function setExpandededGroups(groups: PropertyGroup[]) {
    const exGroups: ExpandedPropertyGroup[] = []
    for (const group of groups) {
        const styling = group.styling || {}
        const objectType = 'fillColours' in styling ? 'node'
                         : 'pathStyle' in styling ? 'path'
                         : group.items.length > 0 ? 'items'
                         : 'none'
        let objectStyle: FillStyling|PathStyling|undefined
        if ('fillColours' in styling) {
            const fillColours: string[] = [...(styling.fillColours || [])]
            let gradientDirection = 'H'
            const colours: string[] = []
            // biome-ignore lint/style/noNonNullAssertion: fillColours is at least 1 long
            if (fillColours.length && ['H', 'V'].includes(fillColours[0] as string)) {
                // @ts-expect-error
                gradientDirection = fillColours.shift()
            }
            if (fillColours.length === 1) {
                // biome-ignore lint/style/noNonNullAssertion: fillColours is 1 long
                colours.push((fillColours[0] as string).trim())
            } else if (fillColours.length) {
                fillColours.forEach(colour => {
                    colours.push(colour.trim())
                })
            }
            objectStyle = {
                gradientFill: colours.length > 1,
                fill: colours,
                gradientDirection
            } as FillStyling
        } else if ('pathStyle' in styling) {
            objectStyle = styling.pathStyle
        }
        exGroups.push({
            ...group,
            objectType,
            objectStyle
        })
    }
    expandedGroups.value = exGroups
}

const emit = defineEmits(['style-event'])

function updateNodeStyle(fillStyle: FillStyling) {
    void vue.nextTick().then(() => {
        const fillColours: string[] = []
        if (fillStyle.gradientFill) {
            fillColours.push(fillStyle.gradientDirection || 'H')
        }
        fillColours.push(...fillStyle.fill)
        emit('style-event', props.toolId, 'node', { fillColours })
    })
}

function updatePathStyle(pathStyle: PathStyling) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, 'path', { pathStyle })
    })
}
</script>
