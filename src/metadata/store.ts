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

import {
    MetadataPropertiesMap,
    type MetadataPropertyValue,
} from './index'

import * as $rdf from '@celldl/editor-rdf'

//==============================================================================

import { RDF, WEB_DECLARATIONS } from './namespaces'

//==============================================================================

export interface PredicateValue {
    predicate: $rdf.PredicateType
    object: $rdf.ObjectType
}

//==============================================================================

export class RdfStore extends $rdf.RdfStore {
    #objectStatementCache: Map<$rdf.SubjectType, $rdf.Statement[]> = new Map()

    // A dummy constructor is needed otherwise instance creation is optimised to
    // the uninitialised $rdf module.
    constructor(_: string='') {
        super()
    }

    #clearStatementCache() {
        this.#objectStatementCache.clear()
    }

    addMetadataPropertiesForSubject(subject: $rdf.SubjectType, properties: MetadataPropertiesMap): $rdf.Statement[] {
        this.#clearStatementCache()
        const statements: $rdf.Statement[] = []
        for (const [predicate, value] of properties.predicateValues()) {
            statements.push(...this.#addMetadataProperties(subject, predicate, value))
        }
        return statements
    }

    #addMetadataProperties(subject: $rdf.SubjectType, predicate: $rdf.PredicateType, value: MetadataPropertyValue): $rdf.Statement[] {
        const statements: $rdf.Statement[] = []
        if ($rdf.isLiteral(value) || $rdf.isNamedNode(value)) {
            // @ts-expect-error: `value` is a Literal or NamedNode
            statements.push(super.add(subject, predicate, value))
        } else if (value instanceof MetadataPropertiesMap) {
            const node = $rdf.blankNode()
            statements.push(super.add(subject, predicate, node, null))
            statements.push(...this.addMetadataPropertiesForSubject(node, value))
        } else if (Array.isArray(value) && value.length > 0) {
            const node = $rdf.blankNode()
            statements.push(super.add(subject, predicate, node, null))
            this.#addListAsCollection(node, value) // ??
        } else if (value instanceof Set) {
            for (const v of value.values()) {
                statements.push(...this.#addMetadataProperties(subject, predicate, v))
            }
        }
        return statements
    }

    addStatementList(statements: $rdf.Statement[]) {
        statements.forEach((s) => {
            this.#objectStatementCache.delete(s.subject)
            super.add(s.subject, s.predicate, s.object, null)
        })
    }

    #metadataFromPredicates(predicateValues: PredicateValue[]): MetadataPropertiesMap {
        const metadata = new MetadataPropertiesMap()
        for (const predicateValue of predicateValues) {
            const value = this.#metadataValue(predicateValue.object)
            if (value) {
                metadata.setProperty(predicateValue.predicate, value, true)
            }
        }
        return metadata
    }

    metadataPropertiesForSubject(subject: $rdf.SubjectType): MetadataPropertiesMap {
        const predicateValues = super.statementsMatching(subject, null, null, null) as PredicateValue[]
        return this.#metadataFromPredicates(predicateValues)
    }

    statementsForSubject(subject: $rdf.SubjectType): $rdf.Statement[] {
        if (this.#objectStatementCache.has(subject)) {
            return this.#objectStatementCache.get(subject) as $rdf.Statement[]
        }
        const statements: $rdf.Statement[] = super.statementsMatching(subject, null, null, null)
        const bnStatements: $rdf.Statement[] = []
        for (const statement of statements) {
            if ($rdf.isBlankNode(statement.object)) {
                // @ts-expect-error: `object` is a BlankNode
                bnStatements.push(...this.statementsForSubject(statement.object))
            }
        }
        const result = [...statements, ...bnStatements]
        this.#objectStatementCache.set(subject, result)
        return result
    }

    removeStatements(statements: $rdf.Statement[]) {
        statements.forEach((s) => {
            this.#objectStatementCache.delete(s.subject)
            super.removeStatementsMatching(s.subject, s.predicate, s.object, null)
        })
    }

    removeStatementsForSubject(subject: $rdf.SubjectType) {
        this.removeStatements(this.statementsForSubject(subject))
    }

    update(sparql: string) {
        this.#clearStatementCache()
        super.update(sparql)
    }

    async serialise(
        baseIri: string,
        contentType: $rdf.ContentType = $rdf.TurtleContentType,
        namespaces: Record<string, string> = {},
        graph: $rdf.NamedNode | null = null
    ): Promise<string> {
        const serialised: string = await super.serialise(
            baseIri, contentType, Object.assign({}, WEB_DECLARATIONS, namespaces), graph)
        return serialised
    }

    #metadataValue(value: $rdf.ObjectType): MetadataPropertyValue | null {
        if ($rdf.isLiteral(value) || $rdf.isNamedNode(value)) {
            // @ts-expect-error: `value` is a Literal or NamedNode
            return value
        } else if ($rdf.isBlankNode(value)) {
            // @ts-expect-error: `value` is a BlankNode
            if (super.contains(value, RDF.uri('rest'), null)) {
                // @ts-expect-error: `value` is a BlankNode
                return this.#listFromCollection(value)
            } else {
                // @ts-expect-error: `value` is a BlankNode
                return this.metadataPropertiesForSubject(value)
            }
        }
        return null
    }

    #listFromCollection(subject: $rdf.SubjectType): MetadataPropertyValue[] {
        // Based on https://github.com/ontola/rdfdev-js/blob/master/packages/collections/src/list.ts
        const result: MetadataPropertyValue[] = []
        const nodes = [subject.value]
        let next = subject
        while (next && !next.equals(RDF.uri('nil'))) {
            const headItem = super.statementsMatching(next, RDF.uri('first'), null, null)
            if (headItem.length !== 1 || headItem[0] === undefined) break
            const value = this.#metadataValue(headItem[0].object)
            if (!value) break
            result.push(value)
            const nextItem = super.statementsMatching(next, RDF.uri('rest'), null, null)
            if (nextItem.length !== 1 || nextItem[0] === undefined) break
            next = nextItem[0].object as $rdf.NamedNode
            if (nodes.includes(next.value)) {
                break
            }
            nodes.push(next.value)
        }
        return result
    }

    #addListAsCollection(subject: $rdf.SubjectType, values: MetadataPropertyValue[]): $rdf.Statement[] {
        const statements: $rdf.Statement[] = []
        let current = subject
        values.forEach((value, index) => {
            statements.push(...this.#addMetadataProperties(current, RDF.uri('first'), value))
            if (index < values.length - 1) {
                const next = $rdf.blankNode()
                statements.push(super.add(current, RDF.uri('rest'), next, null))
                current = next
            }
        })
        statements.push(super.add(current, RDF.uri('rest'), RDF.uri('nil'), null))
        return statements
    }
}

//==============================================================================
//==============================================================================
