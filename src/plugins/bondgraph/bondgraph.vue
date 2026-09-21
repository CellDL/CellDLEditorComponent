<template lang="pug">
    ToolPopover
        template(#content)
            .component-library
                .library-title Component
                .library-icons
                    img.library-icon(
                        v-for="template in libraryComponents.templates"
                        :class="{ selected: template.selected }"
                        :library="PLUGIN_ID"
                        :id="fullId(template)"
                        :src="template.imageData"
                        :aria-label="template.name"
                        v-tippy="{ content: template.name, placement: 'right' }"
                        draggable="true"
                        @dragstart="dragstart"
                        @mousedown="selected"
                    )
            .library-title Bond style
            Select(
                v-model="selectedStyleDefinition"
                :options="styleDefinitions"
                optionLabel="name"
                :highlightOnSelect="true"
                @change="changed"
            )
                template(#value="slotProps")
                    .flex.items-center(v-if="slotProps.value")
                        span.ci(:class="[slotProps.value.icon]") &nbsp;
                        span {{ slotProps.value.name }}
                    span(v-else) {{ slotProps.placeholder }}
                template(#option="slotProps")
                    .flex.items-center
                        span {{ slotProps.option.name }}
</template>

<script setup lang="ts">
import * as vue from 'vue'

import {
    type ComponentLibrary,
    type LibraryComponentTemplate,
    getTemplateEventDetails
} from '#editor/components'

import {
    type ConnectionStyleDefinition,
    CONNECTION_STYLE_DEFINITIONS,
    DEFAULT_CONNECTION_STYLE
} from '#editor/connections'

import { EDITOR_TOOL_IDS } from '#editor/editor'

import ToolPopover from '#root/components/toolbar/ToolPopover.vue'
import type { PopoverEventData } from '#root/components/popovers/types'

import { componentLibraryPlugin } from '#root/plugins'
import { PLUGIN_ID } from '.'

const props = defineProps<{
    toolId: string
}>()

//==============================================================================

const libraryComponents = vue.ref<ComponentLibrary>()

function fullId(template: LibraryComponentTemplate): string {
    return `${PLUGIN_ID}/${template.id}`
}

const idToComponent: Map<string, LibraryComponentTemplate> = new Map()
let selectedId: string | undefined

const bondgraphPlugin = componentLibraryPlugin.getPlugin(PLUGIN_ID)
if (bondgraphPlugin) {
    libraryComponents.value = bondgraphPlugin.componentLibrary
    libraryComponents.value.templates.forEach((template: LibraryComponentTemplate) => {
        const id = fullId(template)
        idToComponent.set(id, template)
        if (template.selected) {
            selectedId = id
        }
    })
}

//==============================================================================

const selectedStyle: string = DEFAULT_CONNECTION_STYLE
const styleDefinitions = vue.ref<ConnectionStyleDefinition[]>(CONNECTION_STYLE_DEFINITIONS)

const selectedStyleDefinition = vue.ref<ConnectionStyleDefinition>()

for (const styleDefinition of styleDefinitions.value) {
    if (styleDefinition.id === selectedStyle) {
        selectedStyleDefinition.value = styleDefinition
        break
    }
}

//==============================================================================

vue.onMounted(async () => {
    if (selectedId) {
        // We want the element rendered so that it has a size
        await vue.nextTick()
        const selectedElement = document.getElementById(selectedId) as HTMLImageElement
        if (selectedElement) {
            document.dispatchEvent(
                new CustomEvent('component-selected', {
                    detail: getTemplateEventDetails(selectedId, selectedElement, null)
                })
            )
        }
    }
})

const emit = defineEmits<{
    'popover-event': [
        toolId: string,
        data: PopoverEventData
    ]
}>()

function selected(e: MouseEvent) {
    const target = e.target as HTMLImageElement
    const component = idToComponent.get(target.id)
    if (target.id && component) {
        if (selectedId && idToComponent.has(selectedId)) {
            // biome-ignore lint/style/noNonNullAssertion: idToComponent.has(selectedId)
            idToComponent.get(selectedId)!.selected = false
        }
        component.selected = true
        selectedId = target.id
        // Tell the editor what template has been selected
        document.dispatchEvent(
            new CustomEvent('component-selected', {
                detail: getTemplateEventDetails(target.id, target, e)
            })
        )
        // Tell the toolbar what component template has been selected
        emit('popover-event', props.toolId, component)
    }
}

function dragstart(e: DragEvent) {
    const target = e.target as HTMLImageElement
    e.dataTransfer?.items.add(JSON.stringify(getTemplateEventDetails(target.id, target, e)), 'text/plain')
    document.dispatchEvent(
        new CustomEvent('component-drag', {
            detail: {
                type: 'dragstart',
                source: props.toolId,
                value: target.id
            }
        })
    )
}
</script>

<style scoped>
.component-library
{
    width: 150px;
    display: flex;
    flex-direction: column;
    border: var(--p-accordion-header-border-width) solid var(--p-content-border-color);
}
.library-title {
    padding: 2px;
    border-bottom: 1px solid green;
    font-size: var(--p-card-title-font-size);
    font-weight: var(--p-card-title-font-weight);
}
.library-icons
{
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    justify-content: space-between;
    gap: 3px;
    overflow-y: auto;
    margin: 1px;
}
.library-icon
{
    width: 45px;
    height: 45px;
    border: 1px solid lightgrey;
    background: var(--p-content-background);
    margin: 0;
    padding: 2px;
}
.library-icon:hover {
    background-color: lightgrey;
}
.library-icon.selected
{
    background: #66aaff;
}
</style>
