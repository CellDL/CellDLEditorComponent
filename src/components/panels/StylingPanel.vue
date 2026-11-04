<template lang="pug">
    ToolPanel
        template(#title)
            div {{ title }}
        template(#content)
            .panel-content
                div(v-if="!properties.objectId") Please select a single element or path.
                template(v-else)
                    Accordion(multiple=true :value="openAccordions")
                        .group(v-for="(group, groupIndex) in properties.groups")
                            AccordionPanel(v-if="group.styling.fillStyle" value="fill")
                                AccordionHeader(:pt="{ root: { class: 'left-icon' } }") Fill
                                AccordionContent
                                    FillStyle(
                                        :fillStyle="group.styling.fillStyle"
                                        @change="(fillStyle) => updateFillStyle(fillStyle, groupIndex)"
                                    )
                            AccordionPanel(v-if="group.styling.cornerStyle" value="corner")
                                AccordionHeader(:pt="{ root: { class: 'left-icon' } }") Corner
                                AccordionContent
                                    CornerStyle(
                                        :cornerStyle="group.styling.cornerStyle"
                                        @change="(cornerStyle) => updateCornerStyle(cornerStyle, groupIndex)"
                                    )
                            AccordionPanel(v-if="group.styling.textStyle" value="text")
                                AccordionHeader(:pt="{ root: { class: 'left-icon' } }") Text
                                AccordionContent
                                    TextStyle(
                                        :textStyle="group.styling.textStyle"
                                        @change="(textStyle) => updateTextStyle(textStyle, groupIndex)"
                                    )
                            AccordionPanel(v-if="group.styling.strokeStyle" value="stroke")
                                AccordionHeader(:pt="{ root: { class: 'left-icon' } }") Stroke
                                AccordionContent
                                    StrokeStyle(
                                        :strokeStyle="group.styling.strokeStyle"
                                        @change="(strokeStyle) => updateStrokeStyle(strokeStyle, groupIndex)"
                                    )
                            AccordionPanel(v-if="group.styling.gapStyle" value="membrane")
                                AccordionHeader(:pt="{ root: { class: 'left-icon' } }") Membrane
                                AccordionContent
                                    GapStyle(
                                        :gapStyle="group.styling.gapStyle"
                                        @change="(gapStyle) => updateGapStyle(gapStyle, groupIndex)"
                                    )
</template>

<script setup lang="ts">
//==============================================================================

import * as vue from 'vue'

import type { ComponentProperties } from '#root/utils/editor-types'
import type { Styling } from '#root/utils/styling'

import CornerStyle from '../widgets/CornerStyle.vue'
import FillStyle from '../widgets/FillStyle.vue'
import GapStyle from '../widgets/GapStyle.vue'
import StrokeStyle from '../widgets/StrokeStyle.vue'
import TextStyle from '../widgets/TextStyle.vue'

import ToolPanel from './ToolPanel.vue'

//==============================================================================

const props = defineProps<{
    title: string
    toolId: string
}>()

const properties = vue.inject(`${props.toolId}-componentProperties`) as vue.Ref<ComponentProperties>

const emit = defineEmits(['style-event'])

//==============================================================================

const openAccordions = vue.computed(() => {
    let defaultPanel: string|undefined
    let panels = 0
    for (const group of properties.value.groups) {
        if (group.styling?.fillStyle) {
            panels += 1
            if (!defaultPanel) {
                defaultPanel = 'fill'
            } else if (defaultPanel !== 'fill') {
                break
            }
        }
        if (group.styling?.cornerStyle) {
            panels += 1
            if (!defaultPanel) {
                defaultPanel = 'corner'
            } else if (defaultPanel !== 'corner') {
                break
            }
        }
        if (group.styling?.textStyle) {
            panels += 1
            if (!defaultPanel) {
                defaultPanel = 'text'
            } else if (defaultPanel !== 'text') {
                break
            }
        }
        if (group.styling?.strokeStyle) {
            panels += 1
            if (!defaultPanel) {
                defaultPanel = 'stroke'
            } else if (defaultPanel !== 'stroke') {
                break
            }
        }
        if (group.styling?.gapStyle) {
            panels += 1
            if (!defaultPanel) {
                defaultPanel = 'membrane'
            } else if (defaultPanel !== 'membrane') {
                break
            }
        }
    }
    return panels === 1 && defaultPanel ? [defaultPanel] : []
})

//==============================================================================

type StylingFields = 'cornerStyle' | 'fillStyle' | 'gapStyle' | 'strokeStyle' | 'textStyle'

function updateStyling(field: StylingFields, value: string, groupIndex: number) {
    const styling = properties.value.groups[groupIndex]?.styling
    if (styling) {
        const newStyling: Styling = {}
        newStyling[field] = value
        emit('style-event', props.toolId, newStyling)
        styling[field] = value
    }
}

function updateCornerStyle(cornerStyle: string, groupIndex: number) {
    updateStyling('cornerStyle', cornerStyle, groupIndex)
}

function updateFillStyle(fillStyle: string, groupIndex: number) {
    updateStyling('fillStyle', fillStyle, groupIndex)
}

function updateGapStyle(gapStyle: string, groupIndex: number) {
    updateStyling('gapStyle', gapStyle, groupIndex)
}

function updateStrokeStyle(strokeStyle: string, groupIndex: number) {
    updateStyling('strokeStyle', strokeStyle, groupIndex)
}

function updateTextStyle(textStyle: string, groupIndex: number) {
    updateStyling('textStyle', textStyle, groupIndex)
}

//==============================================================================
</script>

<style scoped>
.panel-content {
    margin-top: 20px;
}

/* Move the toggle icon to the left */
:deep(.left-icon) {
    display: flex;
    flex-direction: row-reverse;
    justify-content: start;
    column-gap: 10px;
    padding-bottom: 10px;
}

.p-accordionheader {
    padding-left: 0;
}

.p-accordionpanel {
    border-bottom-width: 4px;
    padding-top: 0;
    padding-bottom: 10px;
}

/* Text inputs (above sliders) otherwise default to a 20 character width, which is
   wider than the panel and so widens their group, misaligning its colour boxes */
:deep(.p-accordioncontent-content .p-inputtext) {
    width: 100%;
    min-width: 0;
}

</style>

<style>
/* Allow for FloatLabel text of InputWidget */
.editor-pane .p-accordioncontent-content {
    padding-top: 8px !important;
}
</style>
