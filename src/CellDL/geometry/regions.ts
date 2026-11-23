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
/** biome-ignore-all lint/style/noNonNullAssertion: indices are within the grid and the nodes */

// The regions of a diagram's locations. A node's labels are its locations: one, several
// for a step between locations (which sits on their boundary), or none. The diagram is
// sampled on a grid and each cell goes to the region of highest density (a sum of Gaussians
// at its nodes); split regions are then joined, and each region outlined by marching squares.

//==============================================================================

export interface ElementLocation {
    location?: string
    joins?: boolean         // a step, in the locations of the elements it is bonded to
}

export interface LayoutNode {
    id: string
    x: number               // centre
    y: number
    w: number
    h: number
    labels: string[]
}

export interface LayoutBond {
    a: string
    b: string
}

export interface Point2 {
    x: number
    y: number
}

export interface Rect {
    x0: number
    y0: number
    x1: number
    y1: number
}

export interface RegionGrid {
    x0: number              // centre of cell (0, 0)
    y0: number
    cell: number
    cols: number
    rows: number
    labels: string[]
    owner: Int16Array       // index into labels of each cell
    fixed: Uint8Array       // a node's own cell
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

//==============================================================================

/**
 * The labels of each element: its own location, or, for a step, the locations of the
 * located elements it is bonded to (through unlocated ones) and failing them its own.
 */
export function shadedLocations(locations: Map<string, ElementLocation>,
                                bonds: Map<string, string[]>): Map<string, string[]> {
    const located = (id: string) => {
        const element = locations.get(id)
        return element?.location !== undefined && !element.joins ? element.location : undefined
    }
    const shaded: Map<string, string[]> = new Map()
    for (const id of new Set([...locations.keys(), ...bonds.keys()])) {
        const element = locations.get(id)
        if (!element?.joins) {
            shaded.set(id, element?.location !== undefined ? [element.location] : [])
            continue
        }
        const found: Set<string> = new Set()
        const seen = new Set([id])
        const queue = [id]
        for (const current of queue) {
            for (const next of bonds.get(current) || []) {
                if (seen.has(next)) {
                    continue
                }
                seen.add(next)
                const nextLocation = located(next)
                if (nextLocation !== undefined) {
                    found.add(nextLocation)
                } else if (!locations.get(next)?.joins) {
                    queue.push(next)
                }
            }
        }
        shaded.set(id, found.size ? [...found].sort() : element.location !== undefined ? [element.location] : [])
    }
    return shaded
}

//==============================================================================

function median(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function sortedLabels(nodes: LayoutNode[]): string[] {
    return [...new Set(nodes.flatMap(n => n.labels))].sort()
}

/** The nodes' spacing (the density's width) and their bonds' natural length. */
export function regionScales(nodes: LayoutNode[], bonds: LayoutBond[]): { sigma: number, bondLength: number } {
    const nearest = nodes.map((n, i) => Math.min(...nodes.filter((_, j) => j !== i)
                                                         .map(m => Math.hypot(m.x - n.x, m.y - n.y))))
    const sigma = median(nearest.filter(Number.isFinite)) || 50
    const byId = new Map(nodes.map(n => [n.id, n]))
    const lengths = bonds.map(b => [byId.get(b.a), byId.get(b.b)])
                         .filter(([a, c]) => a && c).map(([a, c]) => Math.hypot(c!.x - a!.x, c!.y - a!.y))
    return { sigma, bondLength: Math.min(3 * sigma, Math.max(sigma, median(lengths) || sigma)) }
}

// A node's density point, or, for a step, one per label displaced towards that label's nodes
function regionPoints(nodes: LayoutNode[], bonds: LayoutBond[], offset: number): (Point2 & { label: string })[] {
    const byId = new Map(nodes.map(n => [n.id, n]))
    const neighbours = new Map<string, LayoutNode[]>()
    for (const b of bonds) {
        const a = byId.get(b.a), c = byId.get(b.b)
        if (!a || !c) continue
        neighbours.set(a.id, [...(neighbours.get(a.id) ?? []), c])
        neighbours.set(c.id, [...(neighbours.get(c.id) ?? []), a])
    }
    const points: (Point2 & { label: string })[] = []
    for (const node of nodes) {
        if (node.labels.length === 1) {
            points.push({ x: node.x, y: node.y, label: node.labels[0]! })
        } else if (node.labels.length > 1) {
            node.labels.forEach((label, k) => {
                const only = (m: LayoutNode) => m.labels.length === 1 && m.labels[0] === label
                let towards = (neighbours.get(node.id) ?? []).filter(only)
                if (towards.length === 0) towards = nodes.filter(only)
                let dx = 0, dy = 0
                if (towards.length) {
                    dx = towards.reduce((s, m) => s + m.x, 0) / towards.length - node.x
                    dy = towards.reduce((s, m) => s + m.y, 0) / towards.length - node.y
                }
                const d = Math.hypot(dx, dy)
                if (d < 1e-9) {
                    const angle = 2 * Math.PI * k / node.labels.length
                    dx = Math.cos(angle); dy = Math.sin(angle)
                } else {
                    dx /= d; dy /= d
                }
                points.push({ x: node.x + offset * dx, y: node.y + offset * dy, label })
            })
        }
    }
    return points
}

//==============================================================================

export function regionGrid(nodes: LayoutNode[], bonds: LayoutBond[], sigma: number, cell: number): RegionGrid {
    const labels = sortedLabels(nodes)
    const minX = Math.min(...nodes.map(n => n.x - n.w / 2)) - sigma
    const maxX = Math.max(...nodes.map(n => n.x + n.w / 2)) + sigma
    const minY = Math.min(...nodes.map(n => n.y - n.h / 2)) - sigma
    const maxY = Math.max(...nodes.map(n => n.y + n.h / 2)) + sigma
    const cols = Math.max(2, Math.ceil((maxX - minX) / cell) + 1)
    const rows = Math.max(2, Math.ceil((maxY - minY) / cell) + 1)
    const size = cols * rows
    const owner = new Int16Array(size).fill(-1)
    const fixed = new Uint8Array(size)
    const grid: RegionGrid = { x0: minX, y0: minY, cell, cols, rows, labels, owner, fixed }
    if (labels.length === 0) return grid

    const density = labels.map(() => new Float32Array(size))
    const reach = Math.ceil(3 * sigma / cell)
    const twoSigma2 = 2 * sigma * sigma
    for (const p of regionPoints(nodes, bonds, 0.6 * sigma)) {
        const f = density[labels.indexOf(p.label)]!
        const ci = Math.round((p.x - minX) / cell), cj = Math.round((p.y - minY) / cell)
        for (let j = Math.max(0, cj - reach); j <= Math.min(rows - 1, cj + reach); j++) {
            const dy = minY + j * cell - p.y
            for (let i = Math.max(0, ci - reach); i <= Math.min(cols - 1, ci + reach); i++) {
                const dx = minX + i * cell - p.x
                f[j * cols + i] = f[j * cols + i]! + Math.exp(-(dx * dx + dy * dy) / twoSigma2)
            }
        }
    }
    for (let k = 0; k < size; k++) {
        let best = -1, value = 1e-12
        for (let l = 0; l < labels.length; l++) {
            if (density[l]![k]! > value) { value = density[l]![k]!; best = l }
        }
        owner[k] = best
    }
    // a node's own cells are its region's
    for (const node of nodes) {
        if (node.labels.length !== 1) continue
        const l = labels.indexOf(node.labels[0]!)
        const i0 = Math.max(0, Math.floor((node.x - node.w / 2 - minX) / cell))
        const i1 = Math.min(cols - 1, Math.ceil((node.x + node.w / 2 - minX) / cell))
        const j0 = Math.max(0, Math.floor((node.y - node.h / 2 - minY) / cell))
        const j1 = Math.min(rows - 1, Math.ceil((node.y + node.h / 2 - minY) / cell))
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                owner[j * cols + i] = l
                fixed[j * cols + i] = 1
            }
        }
    }
    // cells far from every node go to the nearest region
    const queue: number[] = []
    for (let k = 0; k < size; k++) if (owner[k]! >= 0) queue.push(k)
    for (const k of queue) {
        const i = k % cols, j = (k - i) / cols
        for (const [di, dj] of NEIGHBOURS) {
            const ni = i + di, nj = j + dj
            if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
            const nk = nj * cols + ni
            if (owner[nk]! < 0) { owner[nk] = owner[k]!; queue.push(nk) }
        }
    }
    return grid
}

// Connected pieces of each region: a piece per cell, and each piece's label and size
function components(grid: RegionGrid): { id: Int32Array, label: number[], size: number[] } {
    const { cols, rows, owner } = grid
    const id = new Int32Array(cols * rows).fill(-1)
    const label: number[] = [], size: number[] = []
    for (let start = 0; start < id.length; start++) {
        if (id[start]! >= 0 || owner[start]! < 0) continue
        const c = label.length
        label.push(owner[start]!); size.push(0)
        const stack = [start]
        id[start] = c
        while (stack.length) {
            const k = stack.pop()!
            size[c] = size[c]! + 1
            const i = k % cols, j = (k - i) / cols
            for (const [di, dj] of NEIGHBOURS) {
                const ni = i + di, nj = j + dj
                if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
                const nk = nj * cols + ni
                if (id[nk]! < 0 && owner[nk] === owner[start]) { id[nk] = c; stack.push(nk) }
            }
        }
    }
    return { id, label, size }
}

/**
 * Join split regions: a region's smallest piece is joined to another by the shortest
 * corridor that crosses no other node, kept when the number of pieces falls.
 */
export function connectRegions(grid: RegionGrid, attempts: number = 30) {
    const { cols, rows, owner, fixed } = grid
    const hopeless = new Set<string>()
    for (let attempt = 0; attempt < attempts; attempt++) {
        const comp = components(grid)
        const total = comp.label.length
        const perLabel = new Map<number, number[]>()
        comp.label.forEach((l, c) => { perLabel.set(l, [...(perLabel.get(l) ?? []), c]) })
        const piece = [...perLabel.values()].filter(cs => cs.length > 1).flat()
            .filter(c => !hopeless.has(`${comp.label[c]}:${comp.size[c]}`))
            .sort((a, b) => comp.size[a]! - comp.size[b]!)[0]
        if (piece === undefined) break
        const label = comp.label[piece]!
        const previous = new Int32Array(cols * rows).fill(-2)
        const queue: number[] = []
        for (let k = 0; k < previous.length; k++) if (comp.id[k] === piece) { previous[k] = -1; queue.push(k) }
        let reached = -1
        for (let q = 0; q < queue.length && reached < 0; q++) {
            const k = queue[q]!
            const i = k % cols, j = (k - i) / cols
            for (const [di, dj] of NEIGHBOURS) {
                const ni = i + di, nj = j + dj
                if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
                const nk = nj * cols + ni
                if (previous[nk] !== -2 || (fixed[nk] && owner[nk] !== label)) continue
                previous[nk] = k
                if (owner[nk] === label && comp.id[nk] !== piece) { reached = nk; break }
                queue.push(nk)
            }
        }
        const saved = owner.slice()
        for (let k = reached; k >= 0; k = previous[k]!) {
            const i = k % cols, j = (k - i) / cols
            for (let dj = -1; dj <= 1; dj++) {
                for (let di = -1; di <= 1; di++) {
                    const ni = i + di, nj = j + dj
                    if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
                    if (!fixed[nj * cols + ni]) owner[nj * cols + ni] = label
                }
            }
        }
        if (reached < 0 || components(grid).label.length >= total) {
            owner.set(saved)
            hopeless.add(`${label}:${comp.size[piece]}`)
        }
    }
}

//==============================================================================

/** A region's outline: closed loops by marching squares on its blurred cells, then smoothed. */
export function regionLoops(grid: RegionGrid, label: string, blur: number = 2, smooth: number = 2): Point2[][] {
    const { cols, rows, owner, cell, x0, y0 } = grid
    const l = grid.labels.indexOf(label)
    if (l < 0) return []
    let field = new Float32Array(cols * rows)
    for (let k = 0; k < field.length; k++) field[k] = owner[k] === l ? 1 : 0
    for (let b = 0; b < blur; b++) {
        const next = new Float32Array(field.length)
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                let sum = 0, n = 0
                for (let dj = -1; dj <= 1; dj++) {
                    for (let di = -1; di <= 1; di++) {
                        const ni = i + di, nj = j + dj
                        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
                        sum += field[nj * cols + ni]!; n++
                    }
                }
                next[j * cols + i] = sum / n
            }
        }
        field = next
    }
    // padded by a ring outside the grid, so every loop closes
    const pc = cols + 2, pr = rows + 2
    const value = (i: number, j: number) =>
        (i === 0 || j === 0 || i === pc - 1 || j === pr - 1) ? -0.5 : field[(j - 1) * cols + (i - 1)]! - 0.5
    const points = new Map<string, Point2>()
    const edgePoint = (key: string, i1: number, j1: number, i2: number, j2: number) => {
        if (!points.has(key)) {
            const v1 = value(i1, j1), v2 = value(i2, j2)
            const t = v1 / (v1 - v2)
            points.set(key, { x: x0 + (i1 - 1 + t * (i2 - i1)) * cell, y: y0 + (j1 - 1 + t * (j2 - j1)) * cell })
        }
        return key
    }
    const links = new Map<string, string[]>()
    const link = (a: string, b: string) => {
        links.set(a, [...(links.get(a) ?? []), b])
        links.set(b, [...(links.get(b) ?? []), a])
    }
    for (let j = 0; j < pr - 1; j++) {
        for (let i = 0; i < pc - 1; i++) {
            const a = value(i, j), b = value(i + 1, j), c = value(i + 1, j + 1), d = value(i, j + 1)
            const index = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0)
            if (index === 0 || index === 15) continue
            const top = () => edgePoint(`h${i},${j}`, i, j, i + 1, j)
            const right = () => edgePoint(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1)
            const bottom = () => edgePoint(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1)
            const left = () => edgePoint(`v${i},${j}`, i, j, i, j + 1)
            const centre = (a + b + c + d) / 4 > 0
            switch (index) {
                case 1: case 14: link(left(), bottom()); break
                case 2: case 13: link(bottom(), right()); break
                case 3: case 12: link(left(), right()); break
                case 4: case 11: link(top(), right()); break
                case 6: case 9: link(top(), bottom()); break
                case 7: case 8: link(left(), top()); break
                case 5:
                    if (centre) { link(left(), top()); link(bottom(), right()) }
                    else { link(top(), right()); link(left(), bottom()) }
                    break
                case 10:
                    if (centre) { link(top(), right()); link(left(), bottom()) }
                    else { link(left(), top()); link(bottom(), right()) }
                    break
            }
        }
    }
    const loops: Point2[][] = []
    const visited = new Set<string>()
    for (const start of links.keys()) {
        if (visited.has(start)) continue
        const keys: string[] = []
        let previous = '', current = start
        while (!visited.has(current)) {
            visited.add(current)
            keys.push(current)
            const next = links.get(current)!.find(k => k !== previous && !visited.has(k))
                      ?? links.get(current)!.find(k => k !== previous)
            if (next === undefined) break
            previous = current
            current = next
        }
        if (keys.length < 3) continue
        let loop = keys.map(k => points.get(k)!)
        for (let s = 0; s < smooth; s++) loop = chaikin(loop)
        loops.push(loop)
    }
    return loops
}

function chaikin(loop: Point2[]): Point2[] {
    return loop.flatMap((p, k) => {
        const q = loop[(k + 1) % loop.length]!
        return [{ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y },
                { x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y }]
    })
}

//==============================================================================

/**
 * Rectangular regions, when the nodes allow: each holds its nodes and reaches its steps,
 * none overlap or hold another region's node, and they are grown to meet each other or
 * the edge of their common box (`pad` beyond the nodes).
 */
export function rectangularRegions(nodes: LayoutNode[], pad: number): Map<string, Rect>|undefined {
    const labels = sortedLabels(nodes)
    if (labels.length === 0) return undefined
    const rects = new Map<string, Rect>()
    for (const label of labels) {
        const own = nodes.filter(n => n.labels.length === 1 && n.labels[0] === label)
        if (own.length === 0) return undefined
        rects.set(label, {
            x0: Math.min(...own.map(n => n.x - n.w / 2)), y0: Math.min(...own.map(n => n.y - n.h / 2)),
            x1: Math.max(...own.map(n => n.x + n.w / 2)), y1: Math.max(...own.map(n => n.y + n.h / 2))
        })
    }
    // a step between two regions is on the border of each
    for (const n of nodes) {
        if (n.labels.length !== 2) continue
        for (const label of n.labels) {
            const r = rects.get(label)!
            r.x0 = Math.min(r.x0, n.x); r.y0 = Math.min(r.y0, n.y); r.x1 = Math.max(r.x1, n.x); r.y1 = Math.max(r.y1, n.y)
        }
    }
    const overlap = (a: Rect, b: Rect) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6
                                          && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6
    const all = [...rects.entries()]
    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) if (overlap(all[i]![1], all[j]![1])) return undefined
    }
    for (const n of nodes) {
        if (n.labels.length !== 1) continue
        for (const [label, r] of all) {
            if (label !== n.labels[0] && n.x > r.x0 && n.x < r.x1 && n.y > r.y0 && n.y < r.y1) return undefined
        }
    }
    const box = { x0: Math.min(...all.map(([, r]) => r.x0)) - pad, y0: Math.min(...all.map(([, r]) => r.y0)) - pad,
                  x1: Math.max(...all.map(([, r]) => r.x1)) + pad, y1: Math.max(...all.map(([, r]) => r.y1)) + pad }
    const across = (a: Rect, b: Rect, axis: 'x'|'y') => axis === 'x'
        ? Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6 : Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6
    for (const axis of ['x', 'y'] as const) {
        const lo = axis === 'x' ? 'x0' : 'y0', hi = axis === 'x' ? 'x1' : 'y1'
        const targets = all.map(([, r]) => {
            let up = box[hi], down = box[lo]
            for (const [, o] of all) {
                if (o === r || !across(r, o, axis)) continue
                if (o[lo] >= r[hi] - 1e-6) up = Math.min(up, (r[hi] + o[lo]) / 2)
                if (o[hi] <= r[lo] + 1e-6) down = Math.max(down, (r[lo] + o[hi]) / 2)
            }
            return { up, down }
        })
        all.forEach(([, r], k) => { r[hi] = targets[k]!.up; r[lo] = targets[k]!.down })
    }
    // a step joining three or more regions is near each of their rectangles
    for (const n of nodes) {
        if (n.labels.length < 3) continue
        const reach = Math.max(n.w, n.h) + pad
        for (const label of n.labels) {
            const r = rects.get(label)!
            if (Math.max(r.x0 - n.x, n.x - r.x1, 0) > reach || Math.max(r.y0 - n.y, n.y - r.y1, 0) > reach) return undefined
        }
    }
    return rects
}

//==============================================================================
//==============================================================================
