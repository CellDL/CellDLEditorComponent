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
/** biome-ignore-all lint/style/noNonNullAssertion: <query results have their variables> */

import { BGF, SPARQL_PREFIXES } from '@celldl/metadata'

import type { CellDLConnectedObject, CellDLObject } from '#editor/celldlObjects'
import { PathMaker } from '#editor/connections/pathmaker'
import type { CellDLDiagram } from '#editor/diagram'

import { Point, type PointLike } from '#root/utils/points'
import { SVG_ICON_HEIGHT } from '#root/utils/styling'

import {
    type BondInfo,
    type EquationEdit,
    findSpeciesNode,
    type NodeInfo,
    parseEquation,
    planEquationEdit,
    type ReactionEquation,
    reactionEquation,
    type Side,
    type SpeciesNode,
    speciesNameError
} from './equations'
import type { BondgraphPlugin } from '.'

//==============================================================================

const NEW_REACTION = ['OneReactionNode', BGF.uri('ChemicalReactionNode').value]
const NEW_STORE = ['ZeroStorageNode_q', BGF.uri('ChemicalStorageNode').value]

const BESIDE = 120          // From a reaction to a new participant
const SPACING = 70          // Between new participants

//==============================================================================

// The diagram's bonds, nodes, reactions and species stores and sources
function diagramGraph(diagram: CellDLDiagram) {
    const prefix = `${diagram.uri}#`
    const bonds: BondInfo[] = []
    const nodes: Map<string, NodeInfo> = new Map()
    const reactions: string[] = []
    const species: SpeciesNode[] = []
    for (const r of diagram.rdfStore.query(`${SPARQL_PREFIXES}
        SELECT ?bond ?source ?target ?count WHERE {
            ?bond bgf:hasSource ?source ; bgf:hasTarget ?target .
            OPTIONAL { ?bond bgf:bondCount ?count }
        } ORDER BY ?bond`)) {
        if (r.get('bond')!.value.startsWith(prefix)) {
            bonds.push({
                id: r.get('bond')!.value,
                source: r.get('source')!.value,
                target: r.get('target')!.value,
                count: r.get('count') ? Number(r.get('count')!.value) : 1
            })
        }
    }
    for (const r of diagram.rdfStore.query(`${SPARQL_PREFIXES}
        SELECT DISTINCT ?node ?type ?kind ?species ?location WHERE {
            ?node a ?type .
            OPTIONAL { ?node bgf:hasSpecies ?species }
            OPTIONAL { ?node bgf:hasLocation ?location }
            OPTIONAL {
                VALUES ?kind { bgf:Reaction bgf:QuantityStore bgf:PotentialSource }
                ?type rdfs:subClassOf* ?kind
            }
        }`, true)) {
        const node = r.get('node')!.value
        if (!node.startsWith(prefix)) {
            continue
        }
        const type = r.get('type')!.value
        const kind = r.get('kind')?.value
        const info: NodeInfo = nodes.get(node) ?? { species: r.get('species')?.value, location: r.get('location')?.value }
        if (type === BGF.uri('OneNode').value) {
            info.junction = 'one'
        } else if (type === BGF.uri('ZeroNode').value) {
            info.junction = 'zero'
        } else if (kind === BGF.uri('Reaction').value) {
            reactions.push(node)
        } else if (kind && info.species) {
            species.push({
                id: node,
                species: info.species,
                location: info.location,
                isSource: kind === BGF.uri('PotentialSource').value
            })
        }
        nodes.set(node, info)
    }
    return { bonds, nodes, reactions: [...new Set(reactions)], species }
}

export function reactionEquations(diagram: CellDLDiagram): ReactionEquation[] {
    const { bonds, nodes, reactions } = diagramGraph(diagram)
    return reactions.map(id => reactionEquation(id, bonds, nodes))
}

//==============================================================================

export class ReactionEditor {
    #diagram: CellDLDiagram
    #plugin: BondgraphPlugin
    #taken: Point[] = []

    constructor(diagram: CellDLDiagram, plugin: BondgraphPlugin) {
        this.#diagram = diagram
        this.#plugin = plugin
    }

    /**
     * Make reaction `uri` follow the equation `text`, as one undoable change.
     */
    async applyEquation(uri: string, text: string) {
        await this.#asOneChange(() => this.#followEquation(uri, text))
    }

    /**
     * Add a reaction, named `name`, that follows the equation `text`.
     */
    async addReaction(text: string, name: string) {
        const error = speciesNameError(name)
        if (error) {
            throw new Error(error)
        }
        const parsed = parseEquation(text)
        this.#checkSpecies([...parsed.substrates, ...parsed.products])
        await this.#asOneChange(async () => {
            const below = this.#taken.length ? Math.max(...this.#taken.map(p => p.y)) + 2*BESIDE : 100
            const middle = this.#taken.length ? this.#taken.reduce((x, p) => x + p.x, 0)/this.#taken.length : 200
            const reaction = await this.#addElement(NEW_REACTION, this.#placeBeside(new Point(middle, below), null),
                name || `R${reactionEquations(this.#diagram).length + 1}`,
                [...parsed.substrates, ...parsed.products].find(p => p.location)?.location ?? 'c')
            await this.#followEquation(reaction.uri.value, text)
        })
    }

    async #asOneChange(change: () => Promise<void>) {
        this.#taken = []
        for (const object of this.#diagram.svgDiagram.querySelectorAll('g.celldl-Component')) {
            const centroid = this.#diagram.objectById(object.id)?.celldlSvgElement?.centroid
            if (centroid) {
                this.#taken.push(centroid)
            }
        }
        const undoRedo = this.#diagram.context.undoRedo
        undoRedo.beginGroup()
        try {
            await change()
        } finally {
            undoRedo.endGroup()
            this.#diagram.context.editor.notifyChanges()
        }
    }

    async #followEquation(uri: string, text: string) {
        const current = reactionEquations(this.#diagram).find(eq => eq.id === uri)
        const reaction = this.#object(uri) as CellDLConnectedObject|null
        if (!current || !reaction) {
            throw new Error('The reaction is no longer in the diagram')
        }
        const edits = planEquationEdit(current, parseEquation(text))
        this.#checkSpecies(edits.filter(edit => edit.op === 'add'))
        for (const edit of edits) {
            await this.#applyEdit(reaction, current, edit)
        }
    }

    // Check that each species can be found before changing anything
    #checkSpecies(participants: { species: string, location?: string }[]) {
        const species = diagramGraph(this.#diagram).species
        for (const p of participants) {
            findSpeciesNode(species, p.species, p.location)
        }
    }

    async #applyEdit(reaction: CellDLConnectedObject, current: ReactionEquation, edit: EquationEdit) {
        if (edit.op === 'count') {
            const bond = this.#object(edit.bond)
            if (bond) {
                this.#setBondCount(bond, edit.count)
            }
        } else if (edit.op === 'remove') {
            const bond = this.#object(edit.bond)
            if (bond) {
                this.#diagram.removeObject(bond, this.#diagram.context.undoRedo.setDeleteUndoState(bond))
            }
        } else {
            const { bonds, nodes, species } = diagramGraph(this.#diagram)
            const found = findSpeciesNode(species, edit.species, edit.location)
            let node: CellDLConnectedObject|null = null
            if (found) {
                // A store drawn with its species' 0-junction is bonded through it
                const junction = bonds.map(b => b.source === found.id ? b.target : b.target === found.id ? b.source : '')
                                      .find(other => nodes.get(other)?.junction === 'zero')
                node = this.#object(junction ?? found.id) as CellDLConnectedObject|null
            }
            if (!node) {
                const centre = this.#placeBeside(reaction.celldlSvgElement!.centroid, edit.side)
                node = await this.#addElement(NEW_STORE, centre, edit.species,
                                              edit.location ?? current.location ?? 'c')
            }
            const sideJunction = current.sides?.[edit.side]
            const target = (sideJunction ? this.#object(sideJunction) : null) as CellDLConnectedObject|null ?? reaction
            if (edit.side === 'substrate') {
                this.#addBond(node, target, edit.count)
            } else {
                this.#addBond(target, node, edit.count)
            }
        }
    }

    //==========================================================================

    async #addElement([templateId, elementType]: string[], centre: PointLike,
                      species: string, location: string): Promise<CellDLConnectedObject> {
        const template = this.#plugin.getObjectTemplateById(templateId!)!
        const topLeft = new Point(centre.x - SVG_ICON_HEIGHT/2, centre.y - SVG_ICON_HEIGHT/2)
        const svgElement = this.#diagram.context.editorFrame.addSvgElementFromTemplate(template, topLeft)
        const object = this.#diagram.addConnectedObject(svgElement, template)!
        await this.#plugin.setElement(object, elementType!, species, location)
        return object
    }

    #addBond(source: CellDLConnectedObject, target: CellDLConnectedObject, count: number) {
        const startNode = PathMaker.validStartObject(source).node
        if (!startNode) {
            throw new Error(`${source.name} can't take another bond`)
        }
        const pathMaker = new PathMaker(this.#diagram.context, startNode, 'linear')
        pathMaker.addPoint(source.celldlSvgElement!.boundaryIntersections(target.celldlSvgElement!.centroid)[0]!)
        pathMaker.drawTo(target.celldlSvgElement!.boundaryIntersections(source.celldlSvgElement!.centroid)[0]!)
        const endNode = pathMaker.validPathNode(target)
        if (!endNode) {
            pathMaker.close()
            throw new Error(`Can't bond ${source.name} to ${target.name}`)
        }
        pathMaker.finishPath(endNode, this.#diagram)
        if (count !== 1) {
            this.#setBondCount(source.connections.at(-1)!, count)
        }
    }

    #setBondCount(bond: CellDLObject, count: number) {
        const uri = bond.uri.toString()
        bond.rdfStore.update(`${SPARQL_PREFIXES} DELETE WHERE { ${uri} bgf:bondCount ?count }`)
        if (count !== 1) {
            bond.rdfStore.update(`${SPARQL_PREFIXES} INSERT DATA { ${uri} bgf:bondCount ${count} }`)
        }
    }

    #object(uri: string): CellDLObject|null {
        return this.#diagram.objectById(uri.slice(`${this.#diagram.uri}#`.length))
    }

    // A free place beside `centre`: left of it for a substrate, right for a product
    #placeBeside(centre: PointLike, side: Side|null): Point {
        const dx = side === 'substrate' ? -BESIDE : side === 'product' ? BESIDE : 0
        for (let k = 0; k < 40; k += 1) {
            const point = new Point(centre.x + dx, centre.y + (k % 2 ? 1 : -1)*Math.ceil(k/2)*SPACING)
            if (this.#taken.every(t => Math.hypot(t.x - point.x, t.y - point.y) > SPACING/2)) {
                this.#taken.push(point)
                return point
            }
        }
        return new Point(centre.x + dx, centre.y)
    }
}

//==============================================================================
//==============================================================================
