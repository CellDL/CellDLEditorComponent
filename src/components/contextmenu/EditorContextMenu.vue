<template lang="pug">
    ContextMenu(
        ref="menu" :model="items"
    )
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

import * as common from '#root/utils/common'

import { EDITOR_EVENTS_KEY, type EditorStatus } from '#root/utils/editor-types'

//==============================================================================

import { CONTEXT_MENU } from './types'

const isWindowsOrLinux = common.isWindows() || common.isLinux()
const isMacOs = common.isMacOs()

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

function contextMenuEvent(id: string) {
    editorEvents.dispatchEvent(
        new CustomEvent('context-menu-click', {
            detail: { id }
        })
    )
    menu.value.hide()
}

//==============================================================================

const items = vue.computed(() => {
    const editorStatus = vue.toRaw(props.editorStatus)
    return [
        {
            label: 'Undo',
            icon: 'pi pi-undo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Z' : isMacOs ? '⌘Z' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.UNDO),
            disabled: !props.editorStatus.diagramModified
        },
        {
            label: 'Redo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Shift+O' : isMacOs ? '⇧⌘O' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.REDO),
            disabled: !props.editorStatus.canUndo
        },
        { separator: true },
        {
            label: 'Cut',
            icon: 'pi pi-file-export',
            shortcut: isWindowsOrLinux ? 'Ctrl+X' : isMacOs ? '⌘X' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.CUT),
            disabled: !editorStatus.haveSelection
        },
        {
            label: 'Copy',
            icon: 'pi pi-copy',
            shortcut: isWindowsOrLinux ? 'Ctrl+C' : isMacOs ? '⌘C' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.COPY),
            disabled: !editorStatus.haveSelection
        },
        {
            label: 'Paste',
            icon: 'pi pi-clipboard',
            shortcut: isWindowsOrLinux ? 'Ctrl+V' : isMacOs ? '⌘V' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.PASTE),
            disabled: !editorStatus.canPaste
        },
        {
            label: 'Duplicate',
            shortcut: isWindowsOrLinux ? 'Ctrl+D' : isMacOs ? '⌘D' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.DUPLICATE),
            disabled: !editorStatus.haveSelection,
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            shortcut: isWindowsOrLinux ? undefined : isMacOs ? '⌫' : undefined,
            command: () => contextMenuEvent(CONTEXT_MENU.DELETE),
            disabled: !editorStatus.haveSelection,
        },
/* WIP
        { separator: true },
        {
            label: 'Group',
            command: () => contextMenuEvent(CONTEXT_MENU.GROUP),
            disabled: !editorStatus.haveSelection
        },
        {
            label: 'Ungroup',
            command: () => contextMenuEvent(CONTEXT_MENU.UNGROUP),
            disabled: !editorStatus.haveGroupSelection
        },
        { separator: true },
        {
            command: () => contextMenuEvent(CONTEXT_MENU.INSPECT),
            disabled: true,
            label: 'Inspect'
        }
WIP */
    ]}
)

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
