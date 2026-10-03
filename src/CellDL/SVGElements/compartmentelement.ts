//==============================================================================
//==============================================================================

import type { CellDLObject } from '#editor/celldlObjects'
import type { EditorFrame } from '#editor/editor/editorframe'
import { ControlPoint } from '#editor/geometry/controls'

import type { Styling } from '#root/utils/styling'

import { BoundedElement } from './boundedelement'
import { Compartment } from './utils/compartment'

//==============================================================================

export class CompartmentElement extends BoundedElement {
    #bottomRight: ControlPoint
    #compartment: Compartment
    #editorFrame: EditorFrame

    constructor(celldlObject: CellDLObject, svgElement: SVGGraphicsElement,
                gridAligned: boolean=false, align: boolean=false) {
        super(celldlObject, svgElement, gridAligned, align)
        this.#editorFrame = celldlObject.celldlDiagram.editorFrame as EditorFrame
        this.#bottomRight = ControlPoint.fromPoint(this.topLeft.add(this.size))
        this.#compartment = new Compartment(celldlObject)
    }

//==============================================================================

    getStyle(): Styling {
        return this.#compartment.styling
    }

//==============================================================================

    setStyle(styling: Styling) {
        return this.#compartment.setStyling(styling)
    }
}

//==============================================================================
//==============================================================================
