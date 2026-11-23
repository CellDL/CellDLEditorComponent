import { expect, test } from 'bun:test'

import { regionGrid, regionLoops, shadedLocations } from '#editor/geometry/regions'

test('elements are shaded by location', () => {
    // A in a, B in b, a reaction R bonded to both through junctions J1 and J2,
    // and an unbonded reaction S in c
    const locations = new Map([
        ['A', { location: 'a' }],
        ['B', { location: 'b' }],
        ['R', { location: 'a', joins: true }],
        ['S', { location: 'c', joins: true }]
    ])
    const bonds = new Map([
        ['A', ['J1']], ['J1', ['A', 'R']], ['R', ['J1', 'J2']], ['J2', ['R', 'B']], ['B', ['J2']]
    ])
    const shaded = shadedLocations(locations, bonds)
    expect(shaded.get('A')).toEqual(['a'])
    expect(shaded.get('J1')).toEqual([])
    expect(shaded.get('R')).toEqual(['a', 'b'])
    expect(shaded.get('S')).toEqual(['c'])
})

test('two locations split the diagram', () => {
    const node = (id: string, x: number, labels: string[]) => ({ id, x, y: 0, w: 20, h: 20, labels })
    const nodes = [node('A', 0, ['a']), node('R', 100, ['a', 'b']), node('B', 200, ['b'])]
    const grid = regionGrid(nodes, [{ a: 'A', b: 'R' }, { a: 'R', b: 'B' }], 100, 25)
    const loops = regionLoops(grid, 'a')
    expect(loops.length).toBe(1)
    expect(Math.max(...loops.flat().map((p) => p.x))).toBeLessThan(200)
})
