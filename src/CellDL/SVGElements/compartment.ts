//==============================================================================

import type { CellDLDiagram } from '#editor/diagram'
import type { PointLike } from '#root/utils/points'
import {
    COMPARTMENT_BACKGROUND,
    MEMBRANE_COLOUR,
    MEMBRANE_CORNER_RADIUS,
    MEMBRANE_DASH,
    MEMBRANE_GAP,
    MEMBRANE_STROKE_WIDTH
} from '#root/utils/styling'
import { type CompartmentStyling, SVG_URI, svgRect } from '#root/utils/svgUtils'

//==============================================================================

export const DEFAULT_COMPARTMENT_STYLE: CompartmentStyling = {
    cornerRadius: MEMBRANE_CORNER_RADIUS,
    fill: [COMPARTMENT_BACKGROUND],      // WIP -- gradient fill
    gradientFill: false,                    // WIP -- gradient fill
    strokeGap: MEMBRANE_GAP,
    strokeColour: MEMBRANE_COLOUR,
    strokeDashed: false,
    strokeWidth: MEMBRANE_STROKE_WIDTH
}

//==============================================================================

function createRectAsString(topLeft: PointLike, bottomRight: PointLike,
                            styling: CompartmentStyling, offset: number=0): string {
    const attributes: Record<string, string> = {
        stroke: styling.strokeColour,
        'stroke-width': String(styling.strokeWidth)
    }
    const radius = styling.cornerRadius + offset
    if (radius > 0) {
        attributes.rx = String(radius)
    }
    if (styling.strokeDashed) {
        attributes['stroke-dasharray'] = String(MEMBRANE_DASH*styling.strokeWidth)
    }
    // Background only when a single compartment boundary or this is the innermost boundary
    if (offset <= 0) {
        attributes.fill = COMPARTMENT_BACKGROUND
        attributes['fill-opacity'] = '0.8'
    } else {
        attributes.fill = 'none'
    }

    // fill might be a gradient
    // we need the compartment's id for this...
    return svgRect(
        { x: topLeft.x - offset, y: topLeft.y - offset },
        { x: bottomRight.x + offset, y: bottomRight.y + offset },
        attributes
    )
}

/***
type CompartmentDimensions = {
    topLeft: PointLike
    bottomRight: PointLike
}

function getRectDimensions(rect: SVGRectElement, offset: number): CompartmentDimensions {
    const x = Number(rect.getAttribute('x'))
    const y = Number(rect.getAttribute('y'))
    const width = Number(rect.getAttribute('width'))
    const height = Number(rect.getAttribute('height'))
    return {
        topLeft: new Point(x + offset, y + offset),
        bottomRight: new Point(x + width - 2*offset, y + height - 2*offset)
    }
}
***/

function updateRectDimensions(rect: SVGRectElement, expand: number) {  // -ve `expand` will shrink
    const x = Number(rect.getAttribute('x'))
    const y = Number(rect.getAttribute('y'))
    const width = Number(rect.getAttribute('width'))
    const height = Number(rect.getAttribute('height'))
    rect.setAttribute('x', `${x - expand}`)
    rect.setAttribute('y', `${y - expand}`)
    rect.setAttribute('width', `${Math.max(0, width + 2*expand)}`)
    rect.setAttribute('height', `${Math.max(0, height + 2*expand)}`)
}

function getRectStyling(rect: SVGRectElement): CompartmentStyling {
    return {
        fill: [],         // placeholder
        dashed: rect.hasAttribute('stroke-dasharray'),
        strokeGap: 0,       // placeholder
        gradientFill: false,// placeholder
        cornerRadius: Number(rect.getAttribute('rx')) || 0,
        strokeColour: rect.getAttribute('stroke') || MEMBRANE_COLOUR,
        strokeWidth: Number(rect.getAttribute('stroke-width')) || MEMBRANE_STROKE_WIDTH
    }
}

function updateRectStyling(rect: SVGRectElement, styling: CompartmentStyling, offset: number=0) {
    rect.setAttribute('stroke', styling.strokeColour)
    rect.setAttribute('stroke-width', String(styling.strokeWidth))
    const radius = styling.cornerRadius + offset
    if (radius > 0) {
        rect.setAttribute('rx', String(radius))
    } else {
        rect.removeAttribute('rx')
    }
    if (styling.strokeDashed) {
        rect.setAttribute('stroke-dasharray', String(MEMBRANE_DASH*styling.strokeWidth))
    } else {
        rect.removeAttribute('stroke-dasharray')
    }
    rect.setAttribute('fill', offset <= 0 ? COMPARTMENT_BACKGROUND : 'none')
}

//==============================================================================

export class Compartment {
    #boundary0: SVGRectElement
    #boundary1: SVGRectElement|undefined
    #celldlDiagram!: CellDLDiagram
    #styling: CompartmentStyling
    #svgElement: SVGGElement

    private constructor(svgElement: SVGGElement, boundary0: SVGRectElement, boundary1: SVGRectElement|undefined, styling: CompartmentStyling) {
        this.#svgElement = svgElement
        this.#boundary0 = boundary0
        this.#boundary1 = boundary1
        this.#styling = styling
    }

    static create(id: string, topLeft: PointLike, bottomRight: PointLike, styling: CompartmentStyling, diagram: CellDLDiagram): Compartment {
        const svgElement = document.createElementNS(SVG_URI, 'g')
        svgElement.id = id
        svgElement.insertAdjacentHTML('beforeend', createRectAsString(topLeft, bottomRight, styling, styling.strokeGap/2))
        const boundary0 = svgElement.lastChild as SVGRectElement
        let boundary1: SVGRectElement|undefined
        if (styling.strokeGap > 0) {
            svgElement.insertAdjacentHTML('beforeend', createRectAsString(topLeft, bottomRight, styling, -styling.strokeGap/2))
            boundary1 = svgElement.lastChild as SVGRectElement
            svgElement.setAttribute('data-stroke-gap', String(styling.strokeGap))
        }
        const self = new Compartment(svgElement, boundary0, boundary1, styling)
        self.#celldlDiagram = diagram
        return self
    }

    // used when loading compartments from an existing diagram...
    static createFromElement(svgElement: SVGGElement): Compartment|undefined {
        if (svgElement.tagName === 'g') {
            const strokeGap = Number(svgElement.getAttribute('data-stroke-gap')) || 0
            let n = 0
            let boundary0: SVGRectElement|undefined
            let boundary1: SVGRectElement|undefined
            let styling: CompartmentStyling|undefined
            for (const boundary of svgElement.children) {
                if (boundary.tagName === 'rect') {
                    if (n === 0) {
                        boundary0 = boundary as SVGRectElement
                        styling = getRectStyling(boundary0)
                    } else if (n === 1) {
                        boundary1 = boundary as SVGRectElement
                    }
                    if (styling && n < 2) {
                        styling.fill[0] = boundary.getAttribute('fill') || COMPARTMENT_BACKGROUND
                    }
                    n += 1
                }
            }
            if (styling && boundary0) {
                styling.strokeGap = strokeGap
                const self = new Compartment(svgElement, boundary0, boundary1, styling)
//                self.#celldlDiagram = celldlSvgElement.celldlObject.celldlDiagram
                return self
            }
        }
    }

    get styling() {
        return this.#styling
    }

    get svgElement() {
        return this.#svgElement
    }

    setStyling(styling: CompartmentStyling) {
        let strokeGap = Number(this.#svgElement.getAttribute('data-stroke-gap')) || 0
        if (strokeGap !== styling.strokeGap) {
            if (styling.strokeGap === 0) {
                // Double to single boundary
                updateRectDimensions(this.#boundary0, -strokeGap/2)
                if (this.#boundary1) {
                    this.#svgElement.removeChild(this.#boundary1)
                }
                this.#svgElement.removeAttribute('data-stroke-gap')
            } else if (strokeGap === 0) {
                // Single to double boundary
                if (!this.#boundary1) {
                    this.#boundary1 = this.#boundary0.cloneNode() as SVGRectElement
                    this.#svgElement.appendChild(this.#boundary1)
                    updateRectDimensions(this.#boundary1, -styling.strokeGap/2)
                }
                updateRectDimensions(this.#boundary0, styling.strokeGap/2)
                this.#svgElement.setAttribute('data-stroke-gap', String(styling.strokeGap))
            } else {
                // adjust
                const expand = (styling.strokeGap - strokeGap)/2
                updateRectDimensions(this.#boundary0, expand)
                if (this.#boundary1) {
                    updateRectDimensions(this.#boundary1, -expand)
                }
                this.#svgElement.setAttribute('data-stroke-gap', String(styling.strokeGap))
            }
            strokeGap = styling.strokeGap
        }
        updateRectStyling(this.#boundary0, styling,  strokeGap/2)
        if (this.#boundary1) {
            updateRectStyling(this.#boundary1, styling, -strokeGap/2)
        }
    }
}

//==============================================================================
//==============================================================================
