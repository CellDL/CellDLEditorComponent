//==============================================================================

import type { CellDLEditor } from "#editor/editor"
import { EditorFrame } from "#editor/editor/editorframe"
import { ComponentLibraryPlugin } from "#root/plugins"
import type { CellDLDiagram } from "."
import { UndoRedo } from "./undoredo"


//==============================================================================

//==============================================================================

class Alert {
    #editor: CellDLEditor

    constructor(editor: CellDLEditor) {
        this.#editor = editor
    }

    clear() {
        this.#editor.showMessage('')
    }

    error(msg: string) {
        console.error(msg)
        this.#editor.showMessage(msg, 'error')
    }

    info(msg: string) {
        this.#editor.showMessage(msg, 'info')
    }

    tooltip(msg: string) {
        this.#editor.showTooltip(msg, 'error')
    }

    warn(msg: string) {
        console.warn(msg)
        this.#editor.showMessage(msg, 'warn')
    }

    elementError(msg: string, svgElement?: SVGGraphicsElement) {
        svgElement?.classList.add('error')
        this.error(msg)
    }
}

//==============================================================================

export class DiagramContext {
    #alert: Alert
    #componentLibraryPlugin: ComponentLibraryPlugin
    #editor: CellDLEditor
    #editorFrame: EditorFrame
    #undoRedo = new UndoRedo()

    constructor(diagram: CellDLDiagram, editor: CellDLEditor) {
        this.#componentLibraryPlugin = new ComponentLibraryPlugin()
        this.#editor = editor
        this.#alert = new Alert(editor)

        // Make sure we have a group in which to put selection related objects
        // This MUST remain as the last group in the diagram when new layer groups are added...

        this.#editorFrame = new EditorFrame(diagram)
    }

    get alert() {
        return this.#alert
    }

    get componentLibraryPlugin() {
        return this.#componentLibraryPlugin
    }

    get editor() {
        return this.#editor
    }

    get editorFrame() {
        return this.#editorFrame
    }

    get undoRedo() {
        return this.#undoRedo
    }
}

//==============================================================================
//==============================================================================
