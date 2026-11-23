<template lang="pug">
    ContextMenu(
        ref="menu" :model="items"
    )
</template>


<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '#root/utils/themeCssVariables'

useThemeCssVariables('contextmenu')

//==============================================================================

import { CONTEXT_MENU } from '#editor/editor'
import type { ArrangeOp } from '#editor/editor/arrange'
import { EDITOR_EVENTS_KEY } from '#root/utils/editor-types'

export type ContextMenuProps = {
    state: Set<CONTEXT_MENU>,
    event?: Event
}

//==============================================================================

const props = defineProps<{
    contextMenuProps: ContextMenuProps
}>()

// Events go to the editor this component is part of
const editorEvents = vue.inject(EDITOR_EVENTS_KEY, document)

const menu = vue.ref()

vue.watch(
    () => props.contextMenuProps,
    () => {
        if (props.contextMenuProps.event) {
            menu.value.show(props.contextMenuProps.event)
            props.contextMenuProps.event = undefined
        }
    }
)

function contextMenuEvent(id: string, op?: ArrangeOp) {
    editorEvents.dispatchEvent(
        new CustomEvent('context-menu-click', {
            detail: { id, op }
        })
    )
    menu.value.hide()
}

//==============================================================================

function arrangeItems(id: CONTEXT_MENU, ops: [ArrangeOp, string][]) {
    return ops.map(([op, label]) => ({
        command: () => contextMenuEvent(id, op),
        label
    }))
}

const items = vue.computed(() => {
  return [
    {
        command: () => contextMenuEvent(CONTEXT_MENU.DELETE),
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.DELETE),
        label: 'Delete'
    },
    { separator: true },
    {
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.ALIGN),
        items: arrangeItems(CONTEXT_MENU.ALIGN, [
            ['left', 'Left'], ['centre', 'Centre'], ['right', 'Right'],
            ['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']
        ]),
        label: 'Align'
    },
    {
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.DISTRIBUTE),
        items: arrangeItems(CONTEXT_MENU.DISTRIBUTE, [
            ['distribute-h', 'Horizontally'], ['distribute-v', 'Vertically']
        ]),
        label: 'Distribute'
    },
    {
        command: () => contextMenuEvent(CONTEXT_MENU.STRAIGHTEN),
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.STRAIGHTEN),
        label: 'Straighten'
    },
    { separator: true },
    {
        command: () => contextMenuEvent(CONTEXT_MENU.GROUP_OBJECTS),
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.GROUP_OBJECTS),
        label: 'Group'
    },
    {
        command: () => contextMenuEvent(CONTEXT_MENU.EDIT_GROUP),
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.EDIT_GROUP),
        label: 'Edit group'
    },
    {
        command: () => contextMenuEvent(CONTEXT_MENU.UNGROUP_OBJECTS),
        disabled: !props.contextMenuProps?.state.has(CONTEXT_MENU.UNGROUP_OBJECTS),
        label: 'Ungroup'
    },
    { separator: true },
    {
        command: () => contextMenuEvent(CONTEXT_MENU.INFO),
        disabled: true,
        label: 'Info'
    }
  ]}
)

//==============================================================================
</script>
