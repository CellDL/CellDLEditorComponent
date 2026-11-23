/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2026 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import { CELLDL_STYLE_CLASS, type CellDLConnectedObject } from '#editor/celldlObjects'
import type { CellDLDiagram } from '#editor/diagram'
import {
    connectRegions,
    type LayoutBond,
    type LayoutNode,
    rectangularRegions,
    regionGrid,
    regionLoops,
    regionScales,
    shadedLocations,
    sortedLabels
} from '#editor/geometry/regions'
import { SVG_URI } from '#root/utils/svgUtils'

import type { CellDLEditor } from '.'

//==============================================================================

export const LOCATION_SHADING_CLASS = 'location-shading'

const SHADING_COLOURS = ['#3d7fc1', '#d38b2a', '#b9547c', '#4c9a64', '#8566c0', '#2f9c9c', '#a0763e']

//==============================================================================

function svgElement(name: string, attributes: Record<string, string|number>): SVGElement {
    const element = document.createElementNS(SVG_URI, name)
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value))
    }
    return element
}

function regionElement(name: string, colour: string, attributes: Record<string, string|number>): SVGElement {
    return svgElement(name, {
        ...attributes,
        fill: colour, 'fill-opacity': 0.13,
        stroke: colour, 'stroke-opacity': 0.45, 'stroke-width': 1.2
    })
}

function labelElement(text: string, x: number, y: number, colour: string, anchor: string): SVGElement {
    const label = svgElement('text', {
        x, y, fill: colour, 'fill-opacity': 0.75, 'font-size': 18, 'font-weight': 600,
        'text-anchor': anchor, 'font-family': 'system-ui, sans-serif'
    })
    label.textContent = text
    return label
}

//==============================================================================

/**
 * Shade a diagram's regions by the locations of its elements. Shading is
 * editor-specific, never saved, and is redrawn whenever the diagram changes.
 */
export class LocationShading {
    #editor: CellDLEditor
    #enabled: boolean = false
    #frame: number = 0

    constructor(editor: CellDLEditor) {
        this.#editor = editor
        editor.events.addEventListener('file-edited', () => this.redraw())
    }

    show(enabled: boolean) {
        this.#enabled = enabled
        this.redraw()
    }

    redraw() {
        if (this.#frame === 0) {
            this.#frame = requestAnimationFrame(() => {
                this.#frame = 0
                this.#draw()
            })
        }
    }

    #layout(diagram: CellDLDiagram): { nodes: LayoutNode[], bonds: LayoutBond[] } {
        const neighbours: Map<string, string[]> = new Map()
        const nodes: LayoutNode[] = []
        for (const element of diagram.svgDiagram.querySelectorAll(`g.${CELLDL_STYLE_CLASS.Component}`)) {
            const component = diagram.objectById(element.id) as CellDLConnectedObject|null
            const svg = component?.celldlSvgElement
            if (component && svg) {
                const id = component.uri.value
                nodes.push({ id, x: svg.centroid.x, y: svg.centroid.y, w: svg.width, h: svg.height, labels: [] })
                neighbours.set(id, component.connections.flatMap((connection) =>
                    [connection.source, connection.target].flatMap((c) => c && c !== component ? [c.uri.value] : [])))
            }
        }
        const labels = shadedLocations(diagram.context.componentLibraryPlugin.elementLocations(diagram.rdfStore),
                                       neighbours)
        for (const node of nodes) {
            node.labels = labels.get(node.id) || []
        }
        const bonds = [...neighbours].flatMap(([a, bs]) => bs.filter((b) => a < b && neighbours.has(b)).map((b) => ({ a, b })))
        return { nodes, bonds }
    }

    #draw() {
        const diagram = this.#editor.celldlDiagram
        diagram?.svgDiagram?.querySelector(`.${LOCATION_SHADING_CLASS}`)?.remove()
        if (!this.#enabled || !diagram?.svgDiagram) {
            return
        }
        const { nodes, bonds } = this.#layout(diagram)
        const locations = sortedLabels(nodes)
        if (locations.length === 0) {
            return
        }
        const shading = svgElement('g', { class: LOCATION_SHADING_CLASS, 'pointer-events': 'none' })
        const { sigma, bondLength } = regionScales(nodes, bonds)
        const colour = (index: number) => SHADING_COLOURS[index % SHADING_COLOURS.length] as string

        // Rectangles when the regions can be drawn so, else free-form
        const rects = rectangularRegions(nodes, 0.3 * bondLength)
        if (rects) {
            locations.forEach((location, index) => {
                // biome-ignore lint/style/noNonNullAssertion: every location has a rectangle
                const r = rects.get(location)!
                shading.append(regionElement('rect', colour(index), {
                    x: r.x0.toFixed(1), y: r.y0.toFixed(1),
                    width: (r.x1 - r.x0).toFixed(1), height: (r.y1 - r.y0).toFixed(1)
                }))
                shading.append(labelElement(location, r.x0 + 8, r.y0 + 22, colour(index), 'start'))
            })
        } else {
            const grid = regionGrid(nodes, bonds, sigma, sigma / 4)
            connectRegions(grid)
            locations.forEach((location, index) => {
                const d = regionLoops(grid, location)
                    .map((loop) => `M${loop.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} Z`).join(' ')
                shading.append(regionElement('path', colour(index), { d, 'fill-rule': 'evenodd' }))

                // Label the region at its cell nearest its middle
                const l = grid.labels.indexOf(location)
                let sx = 0, sy = 0, n = 0
                for (let k = 0; k < grid.owner.length; k++) {
                    if (grid.owner[k] === l) {
                        sx += k % grid.cols; sy += Math.floor(k / grid.cols); n++
                    }
                }
                let best = -1, bestD = Infinity
                for (let k = 0; k < grid.owner.length; k++) {
                    if (grid.owner[k] === l && !grid.fixed[k]) {
                        const d2 = (k % grid.cols - sx / n) ** 2 + (Math.floor(k / grid.cols) - sy / n) ** 2
                        if (d2 < bestD) {
                            bestD = d2
                            best = k
                        }
                    }
                }
                if (best >= 0) {
                    shading.append(labelElement(location, grid.x0 + (best % grid.cols) * grid.cell,
                                                grid.y0 + Math.floor(best / grid.cols) * grid.cell,
                                                colour(index), 'middle'))
                }
            })
        }
        diagram.addEditorElementOverCompartments(shading)
    }
}

//==============================================================================
//==============================================================================
