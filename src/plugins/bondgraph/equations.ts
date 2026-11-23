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
/** biome-ignore-all lint/style/noNonNullAssertion: <indices are in range> */

// Reaction equations (`2 ADP[c] + Pi[c] ⇌ ATP[c] + H2O[c]`) from a bond graph's bonds,
// and the bond changes that an edited equation makes

//==============================================================================

export type Side = 'substrate' | 'product'

export interface Participant {
    species: string
    location?: string
    count: number
    bond?: string       // The bond to the reaction, or to its side junction
}

export interface ReactionEquation {
    id: string
    name: string
    location?: string
    substrates: Participant[]
    products: Participant[]
    sides?: Partial<Record<Side, string>>   // The reaction's side 1-junctions
}

export interface BondInfo {
    id: string
    source: string
    target: string
    count: number
}

export interface NodeInfo {
    species?: string
    location?: string
    junction?: 'one' | 'zero'
}

export interface SpeciesNode {
    id: string
    species: string
    location?: string
    isSource: boolean
}

//==============================================================================

export function equationText(eq: ReactionEquation): string {
    const sideText = (side: Participant[]) => side.length ? side.map(p =>
        `${p.count === 1 ? '' : `${p.count} `}${p.species}${p.location ? `[${p.location}]` : ''}`).join(' + ') : '∅'
    return `${sideText(eq.substrates)} ⇌ ${sideText(eq.products)}`
}

//==============================================================================

// A node bonded to a reaction, or to its side junction; a 0-junction stands for its store
function participantOf(other: string, bond: BondInfo, bonds: BondInfo[], nodes: Map<string, NodeInfo>): Participant {
    const node = nodes.get(other) ?? {}
    if (node.junction === 'zero') {
        for (const b of bonds) {
            const store = b.source === other ? b.target : b.target === other ? b.source : undefined
            const info = store ? nodes.get(store) : undefined
            if (store && info && !info.junction && info.species) {
                return { species: info.species, location: info.location, count: bond.count, bond: bond.id }
            }
        }
    }
    return { species: node.species ?? other, location: node.location, count: bond.count, bond: bond.id }
}

/**
 * The equation of reaction `id`: what is bonded into it are substrates, what it
 * bonds to are products, read through any side 1-junctions.
 */
export function reactionEquation(id: string, bonds: BondInfo[], nodes: Map<string, NodeInfo>): ReactionEquation {
    const node = nodes.get(id)
    const equation: ReactionEquation = { id, name: node?.species ?? id, location: node?.location, substrates: [], products: [] }
    for (const b of bonds) {
        const other = b.target === id ? b.source : b.source === id ? b.target : undefined
        if (other === undefined) {
            continue
        }
        const side: Side = (b.target === id) ? 'substrate' : 'product'
        const participants = (side === 'substrate') ? equation.substrates : equation.products
        if (nodes.get(other)?.junction === 'one') {
            equation.sides = { ...equation.sides, [side]: other }
            for (const c of bonds) {
                const joined = c.source === other ? c.target : c.target === other ? c.source : undefined
                if (joined !== undefined && joined !== id) {
                    participants.push(participantOf(joined, c, bonds, nodes))
                }
            }
        } else {
            participants.push(participantOf(other, b, bonds, nodes))
        }
    }
    return equation
}

//==============================================================================

// Spaces are optional. A species name can't start with a digit, so a leading number
// is a coefficient (`2ADP`). Names may end in `+` (`H+`, `NAD+`), so a `+` joins two
// species only when it has a space or `]` before it, or a species straight after it.

const ARROW_PATTERN = /<=>|<->|=>|->|⇌|⇄|↔|→|=/
const TERM_PATTERN = /^(?:(\d+) ?)?([^\s[\]]+?)(?:\[([^\]\s]+)\])?$/

export function speciesNameError(name: string): string {
    return /^\s*[\d.]/.test(name) ? `A species name can't start with a number ('${name.trim()}')` : ''
}

function sideTerms(text: string): string[] {
    const terms: string[] = []
    let term = ''
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i]!
        const before = text[i - 1]
        const after = text[i + 1]
        if (c === '+' && (before === undefined || /[\s\]]/.test(before)
                       || (after !== undefined && !/[\s+[]/.test(after)))) {
            terms.push(term)
            term = ''
        } else {
            term += c
        }
    }
    terms.push(term)
    return terms
}

function parseSide(text: string): Participant[] {
    const trimmed = text.trim()
    if (trimmed === '' || trimmed === '∅') {
        return []
    }
    const participants: Participant[] = []
    for (const raw of sideTerms(trimmed)) {
        const term = raw.trim().replace(/\s+/g, ' ').replace(/ ?\[ ?/g, '[').replace(/ ?\]/g, ']')
        const match = term.match(TERM_PATTERN)
        if (!match) {
            throw new Error(`'${term}' is not a species: write it as 'n Species[location]'`)
        }
        const species = match[2]!
        const count = match[1] ? Number(match[1]) : 1
        const error = speciesNameError(species)
        if (error) {
            throw new Error(error)
        } else if (count < 1) {
            throw new Error(`'${term}': a coefficient is a whole number of at least 1`)
        }
        const same = participants.find(p => p.species === species && p.location === match[3])
        if (same) {
            same.count += count
        } else {
            participants.push({ species, location: match[3], count })
        }
    }
    return participants
}

export function parseEquation(text: string): { substrates: Participant[], products: Participant[] } {
    const sides = text.split(ARROW_PATTERN)
    if (sides.length !== 2) {
        throw new Error('An equation has one arrow (⇌, <=> or ->) between its two sides')
    }
    const equation = { substrates: parseSide(sides[0]!), products: parseSide(sides[1]!) }
    if (equation.substrates.length + equation.products.length === 0) {
        throw new Error('An equation needs at least one species')
    }
    return equation
}

//==============================================================================

export type EquationEdit =
    | { op: 'count', bond: string, count: number }
    | { op: 'remove', bond: string }
    | { op: 'add', side: Side, species: string, location?: string, count: number }

/**
 * The bond changes that turn `current` into `edited`. A participant with the same
 * side, species and location (or none given) keeps its bond.
 */
export function planEquationEdit(current: ReactionEquation, edited: ReturnType<typeof parseEquation>): EquationEdit[] {
    const edits: EquationEdit[] = []
    for (const [side, now, wanted] of [
        ['substrate', current.substrates, edited.substrates],
        ['product', current.products, edited.products]
    ] as [Side, Participant[], Participant[]][]) {
        const kept = new Set<Participant>()
        for (const w of wanted) {
            const match = now.find(p => !kept.has(p) && p.species === w.species
                                     && (w.location === undefined || p.location === w.location))
            if (match) {
                kept.add(match)
                if (match.count !== w.count && match.bond) {
                    edits.push({ op: 'count', bond: match.bond, count: w.count })
                }
            } else {
                edits.push({ op: 'add', side, species: w.species, location: w.location, count: w.count })
            }
        }
        for (const p of now) {
            if (!kept.has(p) && p.bond) {
                edits.push({ op: 'remove', bond: p.bond })
            }
        }
    }
    return edits
}

/**
 * The store (else source) of a species, in `location` if given. An error if the
 * species has stores in several locations and none is given.
 */
export function findSpeciesNode(nodes: SpeciesNode[], species: string, location?: string): SpeciesNode|undefined {
    const fits = nodes.filter(n => n.species === species && (location === undefined || n.location === location))
    const stores = fits.filter(n => !n.isSource)
    if (stores.length > 1 && location === undefined) {
        const where = [...new Set(stores.map(n => n.location))].join(', ')
        throw new Error(`${species} is in more than one location (${where}): give it as ${species}[location]`)
    }
    return stores[0] ?? fits[0]
}

//==============================================================================
//==============================================================================
