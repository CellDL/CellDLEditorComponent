<template>
    <WrappedEditor
        :editorCommand="editorCommand"
        :theme="theme"
        @editor-data="onEditorData"
        @editor-state="onEditorState"
    />
</template>

<script setup lang="ts">
/** biome-ignore-all lint/correctness/noUnusedVariables: Vue components and properties arte in fact used */

import { initialise as rdfInitialise } from '@celldl/rdf'

import * as vue from 'vue'

import type { ViewState } from '#root/utils/EditorState'

//==============================================================================

// Initialise the RDF store backend before the editor is imported

const WrappedEditor = vue.defineAsyncComponent(async () => {
    await rdfInitialise()
    return import('./WrappedEditor.vue')
})

//==============================================================================

export type EditorEditCommand = {
    command: 'edit'
    options: {
        action: string
    }
}

export type EditorExportCommand = {
    command: 'export'
    options: {
        action: string
    }
}

export type EditorFileCommand = {
    command: 'file'
    options: {
        action: string
        data?: string
        kind?: string   // export,
        name?: string
        type?: string   // For export: `cellml`, `omex`
    }
}

export type EditorSetStateCommand = {
    command: 'set-state'
    options: {
        action: string
    }
}

export type EditorViewCommand = {
    command: 'view'
    options: ViewState
}

export type CellDLEditorCommand = EditorEditCommand
                                | EditorExportCommand
                                | EditorFileCommand
                                | EditorSetStateCommand
                                | EditorViewCommand

//==============================================================================

export type Theme = 'light' | 'dark' | 'system';

//==============================================================================

export interface CellDLEditorProps {
    editorCommand?: CellDLEditorCommand
    theme?: Theme
}
export type EditorData = {
    data: string
    kind?: string
}

//==============================================================================

const props = defineProps<CellDLEditorProps>()

const emit = defineEmits<{
    'editor-data': [data: EditorData],
    'editor-state': [state: { error: string }]
}>()

function onEditorData(data: EditorData) {
    emit('editor-data', data)
}

function onEditorState(state: { error: string }) {
    emit('editor-state', state)
}
//==============================================================================
//==============================================================================
</script>
