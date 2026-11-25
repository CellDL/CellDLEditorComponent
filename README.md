# The CellDL Editor Vue Component

This package is a [Vue 3](https://vuejs.org/) component for the CellDL Editor, built with the [Composition API](https://vuejs.org/guide/extras/composition-api-faq).

## Props

The component comes with the following props:

```typescript
export interface CellDLEditorProps {
    editorCommand?: CellDLEditorCommand
    readOnly?: boolean
    theme?: Theme
}
```

```typescript
export type CellDLEditorCommand = EditorEditCommand
                                | EditorExportCommand
                                | EditorFileCommand
                                | EditorSetStateCommand
                                | EditorViewCommand

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

export type EditorFileAction = 'close' | 'data' | 'open'

export type EditorFileCommand = {
    command: 'file'
    options: {
        action: EditorFileAction
        data?: string
        kind?: string     // Returned with `EditorData`
        name?: string
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
```

## Emits

It emits the following actions:

```typescript
const emit = defineEmits<{
    'editor-data': [data: EditorData],
    'diagram-click': [detail: DiagramClickEvent],
    'editor-state': [state: EditorStateData]
}>()
```

```typescript
export type EditorData = {
    data: string
    kind?: string     // As passed in EditorFileCommand
}

export type DiagramClickEvent = {
    id: string
}

export type EditorStateData = {
    error?: string
    ready?: boolean
    status?: EditorStatus
}

export interface EditorStatus {
    canPaste?: boolean
    canUndo?: boolean
    diagramModified?: boolean
    haveBentConnections?: boolean
    haveArrangeableComponents?: boolean
    haveDistributableComponents?: boolean
    haveGroupSelection?: boolean
    haveSelection?: boolean
}
```

## index.html

The `Content-Security-Policy` **must** allow `data:` connections and Wasm to be evaluated, for instance:

```html
    <meta
      http-equiv="Content-Security-Policy"
      content="connect-src * data:; script-src 'self' 'wasm-unsafe-eval'" />
```

## main.ts

```typescript
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
```

## App.vue

The Vue component provoides access to all of the Editor's features:

```html
<template>
  <CellDLEditor
    :editorCommand="editorCommand"
    :theme="editorTheme"
    @editorData="onEditorData"
    @editorState="onEditorState"
  />
</template>

<script setup lang="ts">
```
```typescript
import * as vue from 'vue';

import '@celldl/editor/style.css';

import CellDLEditor from '@celldl/editor'
import type { CellDLEditorCommand, EditorData, EditorStateData} from '@celldl/editor';

const editorCommand = vue.ref<CellDLEditorCommand>();
const theme = vue.ref<Theme>('light');

async function onEditorState(state: EditorStateData) {
  if (state.ready) {
    console.log('Editor ready...')
  } else if (status.diagramModified) {
    // The current diagram has has been modified, so update any local state,
    // for instance adding a modified indicator to the diagram's title.
  } else {
    // Use status to enable/disable menu items etc.
  }
}

async function onEditorData(data: EditorData) {
  // Use `data.kind`, as passed in `EditorFileCommand` to determine what to
  // do with `data.data`.
}
```

The editor is initialised with a blank window.

1. To load a CellDL diagram set:

```typescript
  editorCommand.value = {
    command: 'file',
    options: {
      action: 'open',
      data: celldlSource,
      name: filename
    }
  }
```

2. To get serialised CellDL from the editor's window set:

```typescript
  editorCommand.value = {
    command: 'file',
    options: {
      action: 'data',
      kind: '...'
    }
  }
```

with `kind` set as appropriate. This will result in an `editorData` event, to be handled as above.

3. To clear the editing window set:

```typescript
  editorCommand.value = {
    command: 'file',
    options: {
      action: 'close'
    }
  }
```

```html
</script>
```
