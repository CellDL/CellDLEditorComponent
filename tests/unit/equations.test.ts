import { describe, expect, test } from 'bun:test'

import {
    type BondInfo,
    equationText,
    findSpeciesNode,
    type NodeInfo,
    parseEquation,
    planEquationEdit,
    reactionEquation,
    type SpeciesNode
} from '../../src/plugins/bondgraph/equations'

//==============================================================================

const NODES = new Map<string, NodeInfo>([
    ['Re', { species: 'ATPase' }],
    ['q_ADP', { species: 'ADP', location: 'm' }],
    ['q_Pi', { species: 'Pi', location: 'm' }],
    ['q_ATP', { species: 'ATP', location: 'm' }]
])

const BONDS: BondInfo[] = [
    { id: 'b1', source: 'q_ADP', target: 'Re', count: 2 },
    { id: 'b2', source: 'q_Pi', target: 'Re', count: 1 },
    { id: 'b3', source: 'Re', target: 'q_ATP', count: 1 }
]

describe('equations from bonds', () => {
    test('substrates are bonded into a reaction and products out of it', () => {
        const eq = reactionEquation('Re', BONDS, NODES)
        expect(eq.name).toBe('ATPase')
        expect(equationText(eq)).toBe('2 ADP[m] + Pi[m] ⇌ ATP[m]')
    })

    test('through side 1-junctions and species 0-junctions', () => {
        const nodes = new Map<string, NodeInfo>([
            ...NODES, ['one_f', { junction: 'one' }], ['one_r', { junction: 'one' }], ['zero_ADP', { junction: 'zero' }]
        ])
        const bonds: BondInfo[] = [
            { id: 'b1', source: 'one_f', target: 'Re', count: 1 },
            { id: 'b2', source: 'Re', target: 'one_r', count: 1 },
            { id: 'b3', source: 'zero_ADP', target: 'one_f', count: 2 },
            { id: 'b4', source: 'q_ADP', target: 'zero_ADP', count: 1 },
            { id: 'b5', source: 'one_r', target: 'q_ATP', count: 1 }
        ]
        const eq = reactionEquation('Re', bonds, nodes)
        expect(equationText(eq)).toBe('2 ADP[m] ⇌ ATP[m]')
        expect(eq.sides).toEqual({ substrate: 'one_f', product: 'one_r' })
        expect(eq.substrates[0]?.bond).toBe('b3')
    })
})

describe('parsing equations', () => {
    test('with or without spaces, and leading numbers as coefficients', () => {
        for (const text of ['2 ADP[m] + Pi[m] <=> ATP[m]', '2ADP[m]+Pi[m]->ATP[m]', '2 ADP [m] +Pi[m] ⇌ATP[m]']) {
            expect(parseEquation(text)).toEqual({
                substrates: [{ species: 'ADP', location: 'm', count: 2 }, { species: 'Pi', location: 'm', count: 1 }],
                products: [{ species: 'ATP', location: 'm', count: 1 }]
            })
        }
    })

    test('names ending in +', () => {
        expect(parseEquation('NAD+ + H+ ⇌ NADH').substrates.map(p => p.species)).toEqual(['NAD+', 'H+'])
        expect(parseEquation('H++NAD+ ⇌ NADH').substrates.map(p => p.species)).toEqual(['H+', 'NAD+'])
    })

    test('errors', () => {
        expect(() => parseEquation('A + B')).toThrow('one arrow')
        expect(() => parseEquation('A -> B -> C')).toThrow('one arrow')
        expect(() => parseEquation('∅ ⇌ ∅')).toThrow('at least one species')
        expect(() => parseEquation('0 A ⇌ B')).toThrow('at least 1')
    })
})

describe('editing equations', () => {
    test('a changed coefficient, a removed and an added species', () => {
        const eq = reactionEquation('Re', BONDS, NODES)
        expect(planEquationEdit(eq, parseEquation('ADP + H2O[m] ⇌ ATP[m]'))).toEqual([
            { op: 'count', bond: 'b1', count: 1 },
            { op: 'add', side: 'substrate', species: 'H2O', location: 'm', count: 1 },
            { op: 'remove', bond: 'b2' }
        ])
    })

    test('finding a species store', () => {
        const nodes: SpeciesNode[] = [
            { id: 'a', species: 'A', location: 'c', isSource: false },
            { id: 'b', species: 'A', location: 'm', isSource: false },
            { id: 'c', species: 'B', location: 'c', isSource: true }
        ]
        expect(findSpeciesNode(nodes, 'A', 'm')?.id).toBe('b')
        expect(findSpeciesNode(nodes, 'B')?.id).toBe('c')
        expect(findSpeciesNode(nodes, 'C')).toBeUndefined()
        expect(() => findSpeciesNode(nodes, 'A')).toThrow('more than one location')
    })
})
