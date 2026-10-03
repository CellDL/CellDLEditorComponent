//==============================================================================

import type { CellDLObject } from '#editor/celldlObjects'
import type { CellDLDiagram } from '#editor/diagram'

import type { PointLike } from '#root/utils/points'
import {
    COMPARTMENT_BACKGROUND,
    MEMBRANE_COLOUR,
    MEMBRANE_CORNER_RADIUS,
    MEMBRANE_DASH,
    MEMBRANE_GAP,
    MEMBRANE_STROKE_WIDTH,
    type Styling
} from '#root/utils/styling'
import {
    getFillFromString,
    getStrokeString,
    setStrokeFromString,
    SVG_URI,
    svgRect
} from '#root/utils/svgUtils'

//==============================================================================

type CompartmentStyling = {
    cornerRadius: number
    fill: string[]
    strokeGap: number,
    strokeColour: string
    strokeDashed: boolean
    strokeWidth: number
}

const DEFAULT_COMPARTMENT_STYLE: CompartmentStyling = {
    cornerRadius: MEMBRANE_CORNER_RADIUS,
    fill: [COMPARTMENT_BACKGROUND],      // WIP -- gradient fill
    strokeGap: MEMBRANE_GAP,
    strokeColour: MEMBRANE_COLOUR,
    strokeDashed: false,
    strokeWidth: MEMBRANE_STROKE_WIDTH
}

//==============================================================================

export function createCompartmentSvgElement(id: string, topLeft: PointLike, bottomRight: PointLike): SVGGElement {
    const styling = DEFAULT_COMPARTMENT_STYLE
    const svgElement = document.createElementNS(SVG_URI, 'g')
    svgElement.id = id
    svgElement.insertAdjacentHTML('beforeend', createRectAsString(topLeft, bottomRight, styling, styling.strokeGap/2))
    if (styling.strokeGap > 0) {
        svgElement.insertAdjacentHTML('beforeend', createRectAsString(topLeft, bottomRight, styling, -styling.strokeGap/2))
        svgElement.setAttribute('data-stroke-gap', String(styling.strokeGap))
    }
    return svgElement
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
    return svgRect(
        { x: topLeft.x - offset, y: topLeft.y - offset },
        { x: bottomRight.x + offset, y: bottomRight.y + offset },
        attributes
    )
}

function updateRectDimensions(rect: SVGRectElement, delta: number) {  // -ve `delta` will shrink
    const x = Number(rect.getAttribute('x'))
    const y = Number(rect.getAttribute('y'))
    const width = Number(rect.getAttribute('width'))
    const height = Number(rect.getAttribute('height'))
    rect.setAttribute('x', `${x - delta}`)
    rect.setAttribute('y', `${y - delta}`)
    rect.setAttribute('width', `${Math.max(0, width + 2*delta)}`)
    rect.setAttribute('height', `${Math.max(0, height + 2*delta)}`)
}

//==============================================================================

export class Compartment {
    #boundary0: SVGRectElement
    #boundary1: SVGRectElement|undefined
    #celldlDiagram: CellDLDiagram
    #objectId: string
    #styling: Styling = {}
    #svgElement: SVGGElement

    constructor(celldlObject: CellDLObject) {
        this.#celldlDiagram = celldlObject.celldlDiagram
        this.#objectId = celldlObject.id
        this.#svgElement = celldlObject.svgElement as SVGGElement
        const innerRects = [...this.#svgElement.querySelectorAll('rect').values()]
        this.#boundary0 = innerRects[0] as SVGRectElement
        this.#boundary1 = innerRects[1]
        const strokeGap = Number(this.#svgElement.getAttribute('data-stroke-gap')) || 0
        this.#styling.gapStyle = String(strokeGap)
        let fillString = this.#svgElement.getAttribute('data-fill-style')
        if (!fillString) {
            if (innerRects.length) {
                if (strokeGap === 0) {
                    fillString = this.#boundary0.getAttribute('fill') as string
                } else if (this.#boundary1) {
                    fillString = this.#boundary1.getAttribute('fill') as string
                }
            }
            if (!fillString) {
                fillString = COMPARTMENT_BACKGROUND
            } else if (fillString.startsWith('url(') && fillString.endsWith(')')) {
                fillString = 'yellow'
            }
            this.#styling.fillStyle = fillString
        }
        let cornerRadius = 0
        if (innerRects.length) {
            this.#styling.pathStyle = getStrokeString(this.#boundary0 as SVGRectElement, {
                colour: MEMBRANE_COLOUR,
                width: MEMBRANE_STROKE_WIDTH,
                dashScale: MEMBRANE_DASH
            })
            cornerRadius = Number(this.#boundary0.getAttribute('rx') as string)
            if (this.#boundary1) {
                cornerRadius = (cornerRadius + Number(this.#boundary1.getAttribute('rx') as string))/2
            }
        }
        this.#styling.cornerStyle = String(cornerRadius)
    }

    get styling() {
        return this.#styling
    }

    setStyling(styling: Styling) {
        let strokeGap = Number(this.#svgElement.getAttribute('data-stroke-gap')) || 0
        if (styling.gapStyle && strokeGap !== Number(styling.gapStyle)) {
            this.#styling.gapStyle = styling.gapStyle
            const newGap = Number(styling.gapStyle)
            if (newGap === 0) {
                // Double to single boundary
                updateRectDimensions(this.#boundary0, 0)
                if (this.#boundary1) {
                    this.#svgElement.removeChild(this.#boundary1)
                    this.#boundary1 = undefined
                }
                this.#svgElement.removeAttribute('data-stroke-gap')
            } else if (strokeGap === 0) {
                // Single to double boundary
                if (!this.#boundary1) {
                    this.#boundary1 = this.#boundary0.cloneNode() as SVGRectElement
                    this.#svgElement.appendChild(this.#boundary1)
                    updateRectDimensions(this.#boundary1, -newGap/2)
                }
                updateRectDimensions(this.#boundary0, newGap/2)
                this.#svgElement.setAttribute('data-stroke-gap', String(newGap))
            } else {
                // adjust
                const delta = (newGap - strokeGap)/2
                updateRectDimensions(this.#boundary0, delta)
                if (this.#boundary1) {
                    updateRectDimensions(this.#boundary1, -delta)
                }
                this.#svgElement.setAttribute('data-stroke-gap', String(newGap))
            }
            strokeGap = newGap
        }

        if (styling.fillStyle) {
            this.#styling.fillStyle = styling.fillStyle
            const gradientId = `fill-${this.#objectId}`
            const fill = getFillFromString(styling.fillStyle, gradientId)
            this.#svgElement.setAttribute('data-fill-style', fill.dataFillStyle)
            if (strokeGap === 0) {
                this.#boundary0.setAttribute('fill', fill.fillAttribute)
            } else if (this.#boundary1) {
                this.#boundary1.setAttribute('fill', fill.fillAttribute)
            }
            if (fill.gradient.length) {  // and it has been changed...
                this.#celldlDiagram.addDefinition(gradientId, fill.gradient.join(''))
            } else {
                this.#celldlDiagram.removeDefinition(gradientId)
            }
        }

        if (styling.pathStyle) {
            this.#styling.pathStyle = styling.pathStyle
            setStrokeFromString(this.#boundary0, styling.pathStyle)
            if (this.#boundary1) {
                setStrokeFromString(this.#boundary1, styling.pathStyle)
            }
        }

        if (styling.cornerStyle) {
            this.#styling.cornerStyle = styling.cornerStyle
            const radius = Number(styling.cornerStyle)
            this.#boundary0.setAttribute('rx', String(radius + strokeGap/2))
            if (this.#boundary1) {
                if (radius > strokeGap/2) {
                    this.#boundary1.setAttribute('rx', String(radius - strokeGap/2))
                } else {
                    this.#boundary1.removeAttribute('rx')
                }
            }
        }
    }
}

//==============================================================================
//==============================================================================
