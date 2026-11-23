//==============================================================================
//==============================================================================

import * as common from '#root/utils/common'

//==============================================================================

const isWindowsOrLinux = common.isWindows() || common.isLinux()
const isMacOs = common.isMacOs()

//==============================================================================

export enum EDITOR_COMMAND {
    COPY = 'copy',
    CUT = 'cut',
    DELETE = 'delete',
    DUPLICATE = 'duplicate',
    GROUP = 'group',
    INSPECT = 'inspect',
    PASTE = 'paste',
    REDO = 'redo',
    UNDO = 'undo',
    UNGROUP = 'ungroup'
}

//==============================================================================

export type EditorCommandInfo = {
    command: EDITOR_COMMAND
    icon?: string
    keycode?: string
    label: string
    shortcut?: string
}

//==============================================================================

const COMMAND_MODIFIER = isMacOs ? 'Meta' : 'Ctrl'

export const editorCommandMap: Map<EDITOR_COMMAND, EditorCommandInfo> = new Map([
    [
        EDITOR_COMMAND.COPY, {
            command: EDITOR_COMMAND.COPY,
            label: 'Copy',
            icon: 'pi pi-copy',
            shortcut: isWindowsOrLinux ? 'Ctrl+C' : isMacOs ? '⌘C' : undefined,
            keycode: `${COMMAND_MODIFIER}+C`
    }], [
        EDITOR_COMMAND.CUT, {
            command: EDITOR_COMMAND.CUT,
            label: 'Cut',
            icon: 'pi pi-file-export',
            shortcut: isWindowsOrLinux ? 'Ctrl+X' : isMacOs ? '⌘X' : undefined,
            keycode: `${COMMAND_MODIFIER}+X`
    }], [
        EDITOR_COMMAND.DELETE, {
            command: EDITOR_COMMAND.DELETE,
            label: 'Delete',
            icon: 'pi pi-trash',
            shortcut: isWindowsOrLinux ? undefined : isMacOs ? '⌫' : undefined,
            keycode: isMacOs ? 'BACKSPACE' : 'DELETE'
    }], [
        EDITOR_COMMAND.DUPLICATE, {
            command: EDITOR_COMMAND.DUPLICATE,
            label: 'Duplicate',
            shortcut: isWindowsOrLinux ? 'Ctrl+D' : isMacOs ? '⌘D' : undefined,
            keycode: `${COMMAND_MODIFIER}+D`
    }], [
        EDITOR_COMMAND.GROUP, {
            command: EDITOR_COMMAND.GROUP,
            label: 'Group'
    }], [
        EDITOR_COMMAND.INSPECT, {
            command: EDITOR_COMMAND.INSPECT,
            label: 'Inspect',
            shortcut: isWindowsOrLinux ? 'Ctrl+I' : isMacOs ? '⌘I' : undefined,
            keycode: `${COMMAND_MODIFIER}+I`
    }], [
        EDITOR_COMMAND.PASTE, {
            command: EDITOR_COMMAND.PASTE,
            label: 'Paste',
            icon: 'pi pi-clipboard',
            shortcut: isWindowsOrLinux ? 'Ctrl+V' : isMacOs ? '⌘V' : undefined,
            keycode: `${COMMAND_MODIFIER}+V`
    }], [
        EDITOR_COMMAND.REDO, {
            command: EDITOR_COMMAND.REDO,
            label: 'Redo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Z' : isMacOs ? '⇧⌘Z' : undefined,
            keycode: `${COMMAND_MODIFIER}+Shift+Z`
    }], [
        EDITOR_COMMAND.UNDO, {
            command: EDITOR_COMMAND.UNDO,
            label: 'Undo',
            icon: 'pi pi-undo',
            shortcut: isWindowsOrLinux ? 'Ctrl+Z' : isMacOs ? '⌘Z' : undefined,
            keycode: `${COMMAND_MODIFIER}+Z`
    }], [
        EDITOR_COMMAND.UNGROUP, {
            command: EDITOR_COMMAND.UNGROUP,
            label: 'Ungroup'
    }]
])

//==============================================================================

export const keycodeToCommandMap: Map<string, EDITOR_COMMAND> = new Map()

for (const commandInfo of editorCommandMap.values()) {
    if (commandInfo.keycode) {
        keycodeToCommandMap.set(commandInfo.keycode, commandInfo.command)
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
