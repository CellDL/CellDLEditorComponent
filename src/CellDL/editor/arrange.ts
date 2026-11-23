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

/** biome-ignore-all lint/style/noNonNullAssertion: indices are of the bounds given */

import type { CellDLConnection, CellDLObject } from '#editor/celldlObjects'
import type { PointLike } from '#root/utils/points'

//==============================================================================

export type ArrangeOp =
    | 'left' | 'centre' | 'right'
    | 'top' | 'middle' | 'bottom'
    | 'distribute-h' | 'distribute-v'

export type ArrangeBounds = {
    left: number
    top: number
    right: number
    bottom: number
    centre: PointLike
}

type ArrangeDelta = {
    dx: number
    dy: number
}

// Bonds between arranged components this near horizontal or vertical are squared up
export const SQUARE_UP_TOLERANCE = 6

export function minimumForArrange(op: ArrangeOp): number {
    return op.startsWith('distribute') ? 3 : 2
}

//==============================================================================

/**
 * Where each object's centre goes. Aligning uses the edges of the objects' bounding
 * box, or puts their centres exactly on the line through its middle. Distributing
 * keeps the outermost objects in place and makes the gaps between objects equal.
 */
export function arrangedCentres(bounds: ArrangeBounds[], op: ArrangeOp): PointLike[] {
    const deltas: ArrangeDelta[] = bounds.map(() => ({ dx: 0, dy: 0 }))
    if (bounds.length < minimumForArrange(op)) {
        return bounds.map(b => b.centre)
    }
    const left = Math.min(...bounds.map(b => b.left))
    const right = Math.max(...bounds.map(b => b.right))
    const top = Math.min(...bounds.map(b => b.top))
    const bottom = Math.max(...bounds.map(b => b.bottom))
    bounds.forEach((b, i) => {
        const delta = deltas[i]!
        if (op === 'left') {
            delta.dx = left - b.left
        } else if (op === 'right') {
            delta.dx = right - b.right
        } else if (op === 'top') {
            delta.dy = top - b.top
        } else if (op === 'bottom') {
            delta.dy = bottom - b.bottom
        }
    })
    if (op === 'distribute-h') {
        distribute(bounds, deltas, 'left', 'right', 'dx')
    } else if (op === 'distribute-v') {
        distribute(bounds, deltas, 'top', 'bottom', 'dy')
    }
    return bounds.map((b, i) => ({
        x: (op === 'centre') ? (left + right) / 2 : b.centre.x + deltas[i]!.dx,
        y: (op === 'middle') ? (top + bottom) / 2 : b.centre.y + deltas[i]!.dy
    }))
}

function distribute(bounds: ArrangeBounds[], deltas: ArrangeDelta[],
                    start: 'left'|'top', end: 'right'|'bottom', axis: 'dx'|'dy') {
    // Order by centre, so the outermost objects are first and last
    const middle = (b: ArrangeBounds) => (b[start] + b[end]) / 2
    const order = bounds.map((_, i) => i).sort((a, b) => middle(bounds[a]!) - middle(bounds[b]!) || a - b)
    const sizes = order.map(i => bounds[i]![end] - bounds[i]![start])
    const first = bounds[order[0]!]!
    const last = bounds[order.at(-1)!]!
    const gap = (last[end] - first[start] - sizes.reduce((sum, size) => sum + size, 0)) / (order.length - 1)
    let position = first[start]
    order.forEach((index, n) => {
        if (n > 0 && n < order.length - 1) {
            deltas[index]![axis] = position - bounds[index]![start]
        }
        position += sizes[n]! + gap
    })
}

//==============================================================================

/**
 * The bonds of the objects, split into those with both ends among the objects
 * and those with just one end among them.
 */
export function arrangedBonds(objects: CellDLObject[]): { within: CellDLConnection[], leaving: CellDLConnection[] } {
    const arranged: Set<unknown> = new Set(objects)
    const within: Set<CellDLConnection> = new Set()
    const leaving: Set<CellDLConnection> = new Set()
    for (const object of objects) {
        for (const bond of object.connections) {
            const ends = bond.connectedObjects
            if (ends.length >= 2) {
                const count = Number(arranged.has(ends[0])) + Number(arranged.has(ends.at(-1)))
                if (count === 2) {
                    within.add(bond)
                } else if (count === 1) {
                    leaving.add(bond)
                }
            }
        }
    }
    return { within: [...within], leaving: [...leaving] }
}

//==============================================================================
//==============================================================================
