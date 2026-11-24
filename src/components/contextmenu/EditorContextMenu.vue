<template lang="pug">
    ContextMenu(ref="menu" :model="items")
        template(#item="{ item, props, root }")
            a(v-bind="props.action")
                .p-icon(:class="item.icon")
                .p-contextmenu-item-label {{ item.label }}
                i.pi.pi-angle-right.ml-auto(
                    v-if="!root && item.items !== undefined"
                )
                .ml-auto.border.rounded.shortcut(
                    v-if="item.shortcut !== undefined"
                    class="text-xs/3"
                ) {{ item.shortcut }}
</template>


<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '#root/utils/themeCssVariables'

useThemeCssVariables('contextmenu')

//==============================================================================

import { EDITOR_ACTION, editorActionMap, keyName } from '#editor/editor/actions'

import { EDITOR_EVENTS_KEY, type EditorStatus } from '#root/utils/editor-types'

//==============================================================================

const props = defineProps<{
    menuEvent: { event?: Event }
    editorStatus: EditorStatus
}>()

// Events go to the editor this component is part of
const editorEvents = vue.inject(EDITOR_EVENTS_KEY, document)

const menu = vue.ref()

vue.watch(
    () => props.menuEvent,
    () => {
        if (props.menuEvent.event) {
            menu.value.show(props.menuEvent.event)
            props.menuEvent.event = undefined
        }
    }
)

function contextMenuEvent(action: string) {
    editorEvents.dispatchEvent(
        new CustomEvent('context-menu-action', {
            detail: { action }
        })
    )
    menu.value.hide()
}

//==============================================================================

const menuItem = (editorAction: EDITOR_ACTION, disabled: boolean) => {
    const actionInfo = editorActionMap.get(editorAction)
    if (actionInfo) {
        return {
            label: actionInfo.label,
            icon: actionInfo.icon,
            shortcut: actionInfo.shortcut,
            keycode: actionInfo.keycode,
            command: () => contextMenuEvent(actionInfo.action),
            disabled: disabled
        }
    }
    return {}
}

const items = vue.computed(() => {
    const editorStatus = vue.toRaw(props.editorStatus)
    return [
        menuItem(EDITOR_ACTION.UNDO, !editorStatus.diagramModified),
        menuItem(EDITOR_ACTION.REDO, !editorStatus.canUndo),
/* WIP
        { separator: true },
        menuItem(EDITOR_ACTION.CUT, !editorStatus.haveSelection),
        menuItem(EDITOR_ACTION.COPY, !editorStatus.haveSelection),
        menuItem(EDITOR_ACTION.PASTE, !editorStatus.canPaste),
WIP */
        { separator: true },
        menuItem(EDITOR_ACTION.DELETE, !editorStatus.haveSelection),
/* WIP
        { separator: true },
        menuItem(EDITOR_ACTION.DUPLICATE, !editorStatus.haveSelection),
WIP */
/* WIP
        { separator: true },
        menuItem(EDITOR_ACTION.GROUP, !editorStatus.haveSelection),
        menuItem(EDITOR_ACTION.UNGROUP, !editorStatus.haveGroupSelection),
        { separator: true },
        menuItem(EDITOR_ACTION.INSPECT, true0
WIP */
    ]}
)

//==============================================================================

const onKeyDown = (event: KeyboardEvent) => {
    if (menu.value.visible) {
        // Prevent any default browser action (e.g. navigating back)
        event.preventDefault()
        const key = keyName(event)
        for (const item of items.value) {
            if ('disabled' in item && !item.disabled && key === item.keycode) {
                item.action()
            }
        }
    }
}

vue.onMounted(() => window.addEventListener('keydown', onKeyDown));
vue.onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

//==============================================================================
</script>

<style scoped>
.p-contextmenu {
  padding: 0.1rem;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--border-color);
}

.p-contextmenu
  > .p-contextmenu-root-list
  > .p-contextmenu-item
  > .p-contextmenu-item-content
  > .p-contextmenu-item-link
  .p-contextmenu-submenu-icon {
  display: none;
}

:deep(.p-contextmenu-submenu .p-contextmenu-item-link:hover:not(:has(.p-contextmenu-submenu))) {
  border-radius: var(--p-contextmenu-item-border-radius);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-contextmenu-submenu .p-contextmenu-item-link:hover:not(:has(.p-contextmenu-submenu)) .shortcut) {
  border-color: var(--p-primary-contrast-color);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-contextmenu-submenu .p-contextmenu-item-link:hover:not(:has(.p-contextmenu-submenu)) > .p-contextmenu-submenu-icon) {
  color: var(--p-primary-contrast-color) !important;
}

.p-contextmenu-item-link {
  padding: 0.25rem 0.5rem !important;
}

:deep(.p-contextmenu-root-list) {
  gap: 0.1rem;
}

:deep(.p-contextmenu-submenu) {
  padding: 0.1rem;
  z-index: 10;
}

.shortcut {
  border-color: var(--p-content-border-color);
  background: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
}
</style>
