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

export type VariableMapping = Record<string, {
    name: string
    latex?: string
    units?: string
}>

export const VALID_CELLML_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

//==============================================================================

/**
 * Rename variables in CellML, along with their connections and use in MathML.
 *
 * @throws if a new name is invalid or clashes with a component's other variable
 */
export function renameCellMLVariables(cellml: string, mapping: VariableMapping): string {
    const renames = new Map(Object.entries(mapping)
                                  .filter(([name, to]) => to.name && to.name !== name)
                                  .map(([name, to]) => [name, to.name]))
    if (renames.size === 0) {
        return cellml
    }
    for (const name of renames.values()) {
        if (!VALID_CELLML_NAME.test(name)) {
            throw new Error(`Invalid CellML variable name: ${name}`)
        }
    }
    const doc = new DOMParser().parseFromString(cellml, 'application/xml')
    if (doc.getElementsByTagName('parsererror').length) {
        throw new Error('Cannot parse CellML')
    }
    const renamed = (name: string|null) => (name && renames.get(name.trim())) ?? null

    for (const component of Array.from(doc.getElementsByTagNameNS('*', 'component'))) {
        const names: Set<string> = new Set()
        for (const variable of Array.from(component.getElementsByTagNameNS('*', 'variable'))) {
            const name = variable.getAttribute('name') ?? ''
            const newName = renamed(name) ?? name
            if (names.has(newName)) {
                throw new Error(`Renaming gives two \`${newName}\` variables in component \`${component.getAttribute('name')}\``)
            }
            names.add(newName)
            variable.setAttribute('name', newName)
        }
    }
    for (const map of Array.from(doc.getElementsByTagNameNS('*', 'map_variables'))) {
        for (const attribute of ['variable_1', 'variable_2']) {
            const newName = renamed(map.getAttribute(attribute))
            if (newName) {
                map.setAttribute(attribute, newName)
            }
        }
    }
    for (const ci of Array.from(doc.getElementsByTagNameNS('*', 'ci'))) {
        const newName = renamed(ci.textContent)
        if (newName) {
            ci.textContent = newName
        }
    }
    const serialised = new XMLSerializer().serializeToString(doc)
    const declaration = serialised.startsWith('<?xml') ? '' : (cellml.match(/^\s*<\?xml[^>]*\?>\s*/)?.[0] ?? '')
    return declaration + serialised
}

//==============================================================================
//==============================================================================
