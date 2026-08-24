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

import type { Statement } from '@celldl/rdf'

import type { CellDLObject } from '#editor/celldlObjects'
import type { DomLocation } from '#editor/SVGElements'

//==============================================================================

export class StoredObject {
    #celldlObject: CellDLObject
    #domLocation: DomLocation
    #knowledge: Statement[] = []
    #selected: boolean = false

    constructor(celldlObject: CellDLObject, saveKnowledge: boolean=true) {
        this.#celldlObject = celldlObject
        this.#selected = !!celldlObject.selected
        this.#domLocation = celldlObject.celldlSvgElement?.domLocation() || {}
        if (saveKnowledge) {
            this.#knowledge = celldlObject.rdfStore.statementsForSubject(celldlObject.uri)
        }
    }

    get celldlObject(): CellDLObject {
        return this.#celldlObject
    }

    get knowledge(): Statement[] {
        return this.#knowledge
    }

    get selected() {
        return this.#selected
    }

    restoreSvgElement() {
        this.#celldlObject.celldlSvgElement?.restore(this.#domLocation)
    }
}

//==============================================================================
