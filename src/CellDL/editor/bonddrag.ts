/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2025 David Brooks

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

import type { CellDLObject } from '#editor/celldlObjects'
import { PathMaker, type PathNode } from '#editor/connections/pathmaker'
import type { CellDLDiagram } from '#editor/diagram'
import type { Bounds } from '#editor/geometry'
import { isCtrlOrCmd } from '#root/utils/common'
import type { PointLike } from '#root/utils/points'
import { SVG_URI } from '#root/utils/svgUtils'

//==============================================================================

const BOND_HANDLE_CLASS = 'bond-handle'
const BOND_TARGET_VALID_CLASS = 'bond-target-valid'
const BOND_TARGET_DIMMED_CLASS = 'bond-target-dimmed'

const HANDLE_RADIUS = 5         // pixels
const DRAG_START_DISTANCE = 4   // pixels

//==============================================================================

export interface BondDragHost {
    readonly celldlDiagram: CellDLDiagram | null
    readonly canStartBond: boolean
    readonly bondStyle: string | undefined
    objectAt(element: SVGGraphicsElement): CellDLObject | null
    hideTooltip(): void
    click(event: MouseEvent, object: CellDLObject): void
}

export function nearestBoundaryPoint(bounds: Bounds, point: PointLike): PointLike {
    const x = Math.min(Math.max(point.x, bounds.left), bounds.right)
    const y = Math.min(Math.max(point.y, bounds.top), bounds.bottom)
    if (x !== point.x || y !== point.y) {
        return { x, y }
    }
    const distances = [
        { d: x - bounds.left, p: { x: bounds.left, y } },
        { d: bounds.right - x, p: { x: bounds.right, y } },
        { d: y - bounds.top, p: { x, y: bounds.top } },
        { d: bounds.bottom - y, p: { x, y: bounds.bottom } }
    ]
    return distances.reduce((a, b) => (b.d < a.d ? b : a)).p
}

//==============================================================================

/**
 * Draw a bond by dragging from a handle shown on a hovered element's boundary,
 * or from the element itself with Cmd (Ctrl) down.
 */
export class BondDrag {
    #host: BondDragHost
    #handle: SVGCircleElement | null = null
    #handleObject: CellDLObject | null = null
    #pending: { object: CellDLObject, clientX: number, clientY: number } | null = null
    #clickObject: CellDLObject | null = null
    #dragged: boolean = false
    #pathMaker: PathMaker | null = null
    #startObject: CellDLObject | null = null
    #validTargets: Map<string, PathNode> = new Map()
    #markedObjects: CellDLObject[] = []

    constructor(host: BondDragHost) {
        this.#host = host
    }

    get active(): boolean {
        return this.#pathMaker !== null
    }

    pointerOver(event: PointerEvent): boolean {
        if (this.#pathMaker) {
            const object = this.#targetObject(event)
            if (object && object !== this.#startObject && !this.#validTargets.has(object.id)) {
                // Show why it's not valid
                this.#pathMaker.validPathNode(object)
            } else {
                this.#host.hideTooltip()
            }
            return true
        }
        return this.#isHandle(event.target)
    }

    pointerLeave() {
        if (!this.active && !this.#pending) {
            this.#hideHandle()
        }
    }

    pointerDown(event: PointerEvent): boolean {
        this.#clickObject = null
        this.#dragged = false
        if (this.active) {
            // The button was released outside the editor
            this.cancel()
            return true
        }
        if (event.button !== 0 || !this.#host.canStartBond) {
            this.#hideHandle()
            return false
        }
        let object: CellDLObject | null = null
        if (this.#isHandle(event.target)) {
            object = this.#handleObject
        } else if (isCtrlOrCmd(event) && !event.shiftKey) {
            object = this.#bondable(this.#host.objectAt(event.target as SVGGraphicsElement))
        }
        if (object === null) {
            this.#hideHandle()
            return false
        }
        // Don't start the bond until the pointer moves
        this.#pending = { object, clientX: event.clientX, clientY: event.clientY }
        return true
    }

    pointerMove(event: PointerEvent): boolean {
        if (event.buttons === 0 && (this.#pending || this.active)) {
            // The button was released outside the editor
            this.cancel()
        }
        if (this.#pending) {
            if (Math.abs(event.clientX - this.#pending.clientX) <= DRAG_START_DISTANCE
             && Math.abs(event.clientY - this.#pending.clientY) <= DRAG_START_DISTANCE) {
                return true
            }
            const object = this.#pending.object
            this.#pending = null
            if (!this.#start(object)) {
                return true
            }
        }
        const diagram = this.#host.celldlDiagram
        if (this.#pathMaker && diagram) {
            this.#pathMaker.drawTo(diagram.domToSvgCoords(event))
            return true
        }
        if (event.buttons === 0 && this.#host.canStartBond) {
            this.#hover(event)
        } else {
            this.#hideHandle()
        }
        return false
    }

    pointerUp(event: PointerEvent): boolean {
        const pending = this.#pending
        this.#pending = null
        const pathMaker = this.#pathMaker
        const diagram = this.#host.celldlDiagram
        if (!pathMaker || !diagram) {
            if (pending) {
                // Not dragged so handle the following click
                this.#clickObject = pending.object
                return true
            }
            return false
        }
        this.#dragged = true
        const object = this.#targetObject(event)
        const node = object ? this.#validTargets.get(object.id) : undefined
        if (node) {
            pathMaker.finishPath(node, diagram)
            this.#pathMaker = null
            this.#host.hideTooltip()
        } else if (object && object !== this.#startObject) {
            pathMaker.validPathNode(object)
        }
        this.#finish()
        return true
    }

    click(event: MouseEvent): boolean {
        const object = this.#clickObject
        const dragged = this.#dragged
        this.#clickObject = null
        this.#dragged = false
        if (object) {
            this.#host.click(event, object)
        }
        return object !== null || dragged
    }

    cancel(): boolean {
        const cancelled = this.active || this.#pending !== null
        if (this.active) {
            this.#host.hideTooltip()
        }
        this.#finish()
        this.#hideHandle()
        return cancelled
    }

    reset() {
        this.#pending = null
        this.#clickObject = null
        this.#dragged = false
        this.#pathMaker = null
        this.#startObject = null
        this.#validTargets.clear()
        this.#markedObjects = []
        this.#handle = null
        this.#handleObject = null
    }

    #bondable(object: CellDLObject | null): CellDLObject | null {
        return (object?.isConnectable && !object.isConduit && !object.isConnection) ? object : null
    }

    #isHandle(target: EventTarget | null): boolean {
        return this.#handle !== null && target === this.#handle
    }

    #targetObject(event: PointerEvent): CellDLObject | null {
        return this.#bondable(this.#host.objectAt(event.target as SVGGraphicsElement))
    }

    #start(object: CellDLObject): boolean {
        const diagram = this.#host.celldlDiagram
        if (!diagram) {
            return false
        }
        this.#hideHandle()
        const startNode = PathMaker.validStartObject(object).node
        if (!startNode) {
            return false
        }
        this.#startObject = object
        this.#pathMaker = new PathMaker(diagram.context, startNode, this.#host.bondStyle)
        this.#validTargets.clear()
        for (const candidate of diagram.objects) {
            if (candidate === object || !candidate.isComponent || this.#bondable(candidate) === null) {
                continue
            }
            const node = this.#pathMaker.validPathNode(candidate, true)
            if (node) {
                this.#validTargets.set(candidate.id, node)
            }
            candidate.svgElement?.classList.add(node ? BOND_TARGET_VALID_CLASS : BOND_TARGET_DIMMED_CLASS)
            this.#markedObjects.push(candidate)
        }
        diagram.svgDiagram.style.setProperty('cursor', 'crosshair')
        return true
    }

    #finish() {
        if (this.#pathMaker) {
            this.#pathMaker.close()
            this.#pathMaker = null
        }
        for (const object of this.#markedObjects) {
            object.svgElement?.classList.remove(BOND_TARGET_VALID_CLASS, BOND_TARGET_DIMMED_CLASS)
        }
        this.#markedObjects = []
        this.#validTargets.clear()
        this.#pending = null
        this.#startObject = null
        this.#host.celldlDiagram?.svgDiagram.style.removeProperty('cursor')
    }

    #hover(event: PointerEvent) {
        if (this.#isHandle(event.target)) {
            return
        }
        const diagram = this.#host.celldlDiagram
        const object = this.#targetObject(event)
        const bounds = object?.celldlSvgElement?.svgBounds()
        if (!diagram || !object || !bounds || !object.isComponent
         || object.numConnections >= object.maxConnections) {
            this.#hideHandle()
            return
        }
        const centre = nearestBoundaryPoint(bounds, diagram.domToSvgCoords(event))
        if (this.#handle === null || !this.#handle.isConnected) {
            this.#handle = document.createElementNS(SVG_URI, 'circle')
            this.#handle.classList.add(BOND_HANDLE_CLASS)
            diagram.context.editorFrame.restoreElement(this.#handle)
        }
        const scale = diagram.svgDiagram.getScreenCTM()?.a || 1
        this.#handle.setAttribute('cx', String(centre.x))
        this.#handle.setAttribute('cy', String(centre.y))
        this.#handle.setAttribute('r', String(HANDLE_RADIUS / scale))
        this.#handleObject = object
    }

    #hideHandle() {
        if (this.#handle) {
            this.#host.celldlDiagram?.context.editorFrame.removeElement(this.#handle)
            this.#handle = null
        }
        this.#handleObject = null
    }
}

//==============================================================================
//==============================================================================
