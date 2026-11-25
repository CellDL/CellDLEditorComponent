//==============================================================================
//==============================================================================

import * as common from '#root/utils/common'

//==============================================================================

const isWindowsOrLinux = common.isWindows() || common.isLinux()
const isMacOs = common.isMacOs()

//==============================================================================

import { COMPONENT_ARRANGEMENT } from './arrange'

//==============================================================================

export enum EDITOR_ACTION {
    ALIGN_COMPONENTS = 'align-components',
    COPY = 'copy',
    CUT = 'cut',
    DELETE = 'delete',
    DISTRIBUTE_COMPONENTS = 'distribute-components',
    DUPLICATE = 'duplicate',
    GROUP = 'group',
    INSPECT = 'inspect',
    PASTE = 'paste',
    REDO = 'redo',
    STRAIGHTEN_PATH = 'straighten-path',
    UNDO = 'undo',
    UNGROUP = 'ungroup'
}

//==============================================================================

export type EditorActionInfo = {
    action: EDITOR_ACTION
    icon?: string
    items?: [string, string][],
    keycode?: string
    label: string
    shortcut?: string
}

//==============================================================================

const META_KEY_NAME = isMacOs ? 'Meta' : 'Ctrl'

export const editorActionMap: Map<EDITOR_ACTION, EditorActionInfo> = new Map([
    [
        EDITOR_ACTION.COPY, {
            action: EDITOR_ACTION.COPY,
            label: 'Copy',
            icon: 'pi pi-copy',
            shortcut: isWindowsOrLinux ? 'Ctrl+C' : isMacOs ? '⌘C' : undefined,
            keycode: `${META_KEY_NAME}+C`
    }], [
        EDITOR_ACTION.CUT, {
            action: EDITOR_ACTION.CUT,
            label: 'Cut',
            icon: 'pi pi-file-export',
            shortcut: isWindowsOrLinux ? 'Ctrl+X' : isMacOs ? '⌘X' : undefined,
            keycode: `${META_KEY_NAME}+X`
    }], [
        EDITOR_ACTION.DELETE, {
            action: EDITOR_ACTION.DELETE,
            label: 'Delete',
            icon: 'pi pi-trash',
            shortcut: isWindowsOrLinux ? undefined : isMacOs ? '⌫' : undefined,
            keycode: isMacOs ? 'BACKSPACE' : 'DELETE'
    }], [
        EDITOR_ACTION.DUPLICATE, {
            action: EDITOR_ACTION.DUPLICATE,
            label: 'Duplicate',
            shortcut: isWindowsOrLinux ? 'Ctrl+D' : isMacOs ? '⌘D' : undefined,
            keycode: `${META_KEY_NAME}+D`
    }], [
        EDITOR_ACTION.GROUP, {
            action: EDITOR_ACTION.GROUP,
            label: 'Group'
    }], [
        EDITOR_ACTION.INSPECT, {
            action: EDITOR_ACTION.INSPECT,
            label: 'Inspect',
            shortcut: isWindowsOrLinux ? 'Ctrl+I' : isMacOs ? '⌘I' : undefined,
            keycode: `${META_KEY_NAME}+I`
    }], [
        EDITOR_ACTION.PASTE, {
            action: EDITOR_ACTION.PASTE,
            label: 'Paste',
            icon: 'pi pi-clipboard',
            shortcut: isWindowsOrLinux ? 'Ctrl+V' : isMacOs ? '⌘V' : undefined,
            keycode: `${META_KEY_NAME}+V`
    }], [
        EDITOR_ACTION.ALIGN_COMPONENTS, {
            action: EDITOR_ACTION.ALIGN_COMPONENTS,
            label: 'Align components',
            items: [
                ['Left', COMPONENT_ARRANGEMENT.LEFT], ['Centre', COMPONENT_ARRANGEMENT.CENTRE], ['Right', COMPONENT_ARRANGEMENT.RIGHT],
                ['Top', COMPONENT_ARRANGEMENT.TOP], ['Middle', COMPONENT_ARRANGEMENT.MIDDLE], ['Bottom', COMPONENT_ARRANGEMENT.BOTTOM],

            ]
    }], [
        EDITOR_ACTION.DISTRIBUTE_COMPONENTS, {
            action: EDITOR_ACTION.DISTRIBUTE_COMPONENTS,
            label: 'Distribute components',
            items: [
                ['Horizontally', COMPONENT_ARRANGEMENT.SPACE_HORIZONTALLY], ['Vertically', COMPONENT_ARRANGEMENT.SPACE_VERTICALLY],
            ]
    }], [
        EDITOR_ACTION.STRAIGHTEN_PATH, {
            action: EDITOR_ACTION.STRAIGHTEN_PATH,
            label: 'Straighten paths'
    }], [
        EDITOR_ACTION.REDO, {
            action: EDITOR_ACTION.REDO,
            label: 'Redo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Z' : isMacOs ? '⇧⌘Z' : undefined,
            keycode: `${META_KEY_NAME}+Shift+Z`
    }], [
        EDITOR_ACTION.UNDO, {
            action: EDITOR_ACTION.UNDO,
            label: 'Undo',
            icon: 'pi pi-undo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Z' : isMacOs ? '⌘Z' : undefined,
            keycode: `${META_KEY_NAME}+Z`
    }], [
        EDITOR_ACTION.UNGROUP, {
            action: EDITOR_ACTION.UNGROUP,
            label: 'Ungroup'
    }]
])

//==============================================================================

export const keycodeToEditorAction: Map<string, EDITOR_ACTION> = new Map()

for (const actionInfo of editorActionMap.values()) {
    if (actionInfo.keycode) {
        keycodeToEditorAction.set(actionInfo.keycode, actionInfo.action)
    }
}

//==============================================================================

export function keyName(keyEvent: KeyboardEvent): string {
    const keyName: string[] = []
    if (keyEvent.metaKey) {
        keyName.push('Meta')
    }
    if (keyEvent.ctrlKey) {
        keyName.push('Ctrl')
    }
    if (keyEvent.altKey)  {
        keyName.push('Alt')
    }
    if (keyEvent.shiftKey)  {
        keyName.push('Shift')
    }
    keyName.push(keyEvent.key.toUpperCase())
    return keyName.join('+')
}

//==============================================================================
//==============================================================================
