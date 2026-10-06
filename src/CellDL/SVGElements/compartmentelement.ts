//==============================================================================
//==============================================================================

import type { CellDLObject } from '#editor/celldlObjects'

import type { Styling } from '#root/utils/styling'

import { BoundedElement } from './boundedelement'
import { Compartment } from './utils/compartment'

//==============================================================================

export class CompartmentElement extends BoundedElement {
    #compartment: Compartment

    constructor(celldlObject: CellDLObject, svgElement: SVGGraphicsElement,
                gridAligned: boolean=false, align: boolean=false) {
        super(celldlObject, svgElement, gridAligned, align)
        this.#compartment = new Compartment(celldlObject)
    }

//==============================================================================

    updateElement() {
        this.#compartment.update()
    }

//==============================================================================

    getStyle(): Styling {
        return this.#compartment.styling
    }

    setStyle(styling: Styling) {
        return this.#compartment.setStyling(styling)
    }
}

//==============================================================================
//==============================================================================
