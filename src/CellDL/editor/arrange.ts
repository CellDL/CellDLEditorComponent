//==============================================================================
//==============================================================================

/** biome-ignore-all lint/style/noNonNullAssertion: indices are of the bounds given */

import type { CellDLConnectedObject, CellDLConnection } from '#editor/celldlObjects'
import type { PointLike } from '#root/utils/points'

//==============================================================================

export enum COMPONENT_ARRANGEMENT {
    LEFT = 'left',
    CENTRE = 'centre',
    RIGHT = 'right',
    TOP = 'top',
    MIDDLE = 'middle',
    BOTTOM = 'bottom',
    SPACE_HORIZONTALLY = 'distribute-h',
    SPACE_VERTICALLY = 'distribute-v',
}

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

//==============================================================================

// Paths between arranged components this near to horizontal or vertical are squared up
export const SQUARE_UP_TOLERANCE = 6            // pixels

//==============================================================================

export function minimumComponentsForArranging(op: COMPONENT_ARRANGEMENT): number {
    return [COMPONENT_ARRANGEMENT.SPACE_HORIZONTALLY, COMPONENT_ARRANGEMENT.SPACE_VERTICALLY].includes(op) ? 3 : 2
}

//==============================================================================

/**
 * Where each component's centre goes. Aligning uses the edges of the components' bounding
 * box, or puts their centres exactly on the line through its middle. Distributing
 * keeps the outermost components in place and makes the gaps between components equal.
 */
export function arrangedComponentCentres(bounds: ArrangeBounds[], op: COMPONENT_ARRANGEMENT): PointLike[] {
    const deltas: ArrangeDelta[] = bounds.map(() => ({ dx: 0, dy: 0 }))
    if (bounds.length < minimumComponentsForArranging(op)) {
        return bounds.map(b => b.centre)
    }
    const left = Math.min(...bounds.map(b => b.left))
    const right = Math.max(...bounds.map(b => b.right))
    const top = Math.min(...bounds.map(b => b.top))
    const bottom = Math.max(...bounds.map(b => b.bottom))
    bounds.forEach((b, i) => {
        const delta = deltas[i]!
        if (op === COMPONENT_ARRANGEMENT.LEFT) {
            delta.dx = left - b.left
        } else if (op === COMPONENT_ARRANGEMENT.RIGHT) {
            delta.dx = right - b.right
        } else if (op === COMPONENT_ARRANGEMENT.TOP) {
            delta.dy = top - b.top
        } else if (op === COMPONENT_ARRANGEMENT.BOTTOM) {
            delta.dy = bottom - b.bottom
        }
    })
    if (op === COMPONENT_ARRANGEMENT.SPACE_HORIZONTALLY) {
        distributeComponents(bounds, deltas, 'left', 'right', 'dx')
    } else if (op === COMPONENT_ARRANGEMENT.SPACE_VERTICALLY) {
        distributeComponents(bounds, deltas, 'top', 'bottom', 'dy')
    }
    return bounds.map((b, i) => ({
        x: (op === COMPONENT_ARRANGEMENT.CENTRE) ? (left + right) / 2 : b.centre.x + deltas[i]!.dx,
        y: (op === COMPONENT_ARRANGEMENT.MIDDLE) ? (top + bottom) / 2 : b.centre.y + deltas[i]!.dy
    }))
}

function distributeComponents(bounds: ArrangeBounds[], deltas: ArrangeDelta[],
                    start: 'left'|'top', end: 'right'|'bottom', axis: 'dx'|'dy') {
    // Order by centre, so the outermost components are first and last
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
 * The connections between components, split into those with both ends among the components
 * and those with just one end among them.
 */
export function arrangedPaths(components: CellDLConnectedObject[]): { within: CellDLConnection[], leaving: CellDLConnection[] } {
    const arranged: Set<CellDLConnectedObject> = new Set(components)
    const within: Set<CellDLConnection> = new Set()
    const leaving: Set<CellDLConnection> = new Set()
    for (const component of components) {
        for (const connection of component.connections) {
            const ends = connection.connectedObjects
            if (ends.length >= 2) {
                const count = Number(arranged.has(ends[0]!)) + Number(arranged.has(ends.at(-1)!))
                if (count === 2) {
                    within.add(connection)
                } else if (count === 1) {
                    leaving.add(connection)
                }
            }
        }
    }
    return { within: [...within], leaving: [...leaving] }
}

//==============================================================================
//==============================================================================
