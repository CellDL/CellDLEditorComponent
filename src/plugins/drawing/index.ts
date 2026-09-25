//==============================================================================
//==============================================================================

import type { MetadataStore } from '@celldl/metadata'

import type {
    CellDLConnection,
    CellDLObject
} from '#editor/celldlObjects'
import { alert } from '#editor/editor/alerts'

import type { PluginInterface } from '#root/plugins'
import {
    PANEL_ID,
    type PropertyGroup,
    type ValueChange
} from '#root/utils/editor-types'
import type {
    PathStyling,
    Styling
} from '#root/utils/styling'
import {
    getSvgFillStyle,
//    getSvgPathStyle,
    setSvgPathStyle,
} from '#root/utils/svgUtils'

//==============================================================================

export const PLUGIN_ID = 'core-celldl-components'

const STYLE_GROUP_ID = 'drawing-element-style'

const STYLING_TEMPLATE: PropertyGroup = {
    groupId: STYLE_GROUP_ID,
    items: [],
    styling: {}
}

//==============================================================================


interface PluginData {
    fillColours?: string[]
}

//==============================================================================

export class DrawingPlugin implements PluginInterface {
    readonly id: string = PLUGIN_ID

    get componentLibrary() {
        return {
            id: this.id,
            name: 'Drawing',
            templates: []
        }
    }

    getPanelTemplates(panelId: PANEL_ID) {
        if (panelId === PANEL_ID.STYLE_PANEL) {
            // check...
            return [STYLING_TEMPLATE]
        }
        return []
    }

    getTemplateName(_rdfType: string) {
        return undefined
    }

    getObjectTemplateById(_id: string) {
        return undefined
    }

    //==========================================================================

    openDiagram(_uri: string, _rdfStore: MetadataStore) {
    }


    addPluginMetadataToStore(_rdfStore: MetadataStore) {
    }

    getPluginData(_celldlObject: CellDLObject): object {
        return {}
    }

    statusText(_celldlObject: CellDLObject): string {
        return ''
    }


    //==========================================================================

    addComponent(_component: CellDLObject) {
    }

    componentDeleted(_component: CellDLObject) {
    }

    addConnection(_connection: CellDLConnection) {
    }

    checkConnectionValid(_sourceObject: CellDLObject, _targetObject: CellDLObject) {
        return undefined
    }

    connectionDeleted(_connection: CellDLConnection) {
    }

    getMaxConnections(_celldlObject: CellDLObject): number {
        return Infinity
    }

    //==========================================================================

    loadComponentProperties(componentProperties: PropertyGroup[], panelId: PANEL_ID, celldlObject: CellDLObject) {
        alert.clear()
        if (panelId === PANEL_ID.STYLE_PANEL) {
            componentProperties.forEach(group => {
                this.#loadElementStyling(celldlObject, group)
            })
        }
    }

    #loadElementStyling(celldlObject: CellDLObject, componentGroup: PropertyGroup) {
        if (celldlObject.celldlSvgElement) {
            const pluginData = (<PluginData>celldlObject.pluginData(this.id))
            if (!('fillColours' in pluginData)) {
                pluginData.fillColours = getSvgFillStyle(celldlObject.celldlSvgElement.svgElement.outerHTML)
            }
            componentGroup.styling = {
                fillColours: pluginData.fillColours || []
            }
        }
    }

    //==========================================================================

    async updateObjectProperties(_celldlObject: CellDLObject, _panelId: PANEL_ID, _itemId: string, _value: ValueChange,
                                 _componentProperties: PropertyGroup[]) {

    }

    //==========================================================================

    async updatedComponentStyling(celldlObject: CellDLObject, objectType: string, styling: Styling) {
        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        if (objectType === 'node' && 'fillColours' in styling) {
            const fillColours = styling.fillColours as string[] || []
            if (fillColours.toString() !== pluginData.fillColours?.toString()) {
                pluginData.fillColours = [...fillColours]
//                await this.#updateSvgElement(celldlObject, pluginData.species, pluginData.location)
            }
        } else if (objectType === 'path' && 'pathStyle' in styling) {
            setSvgPathStyle(celldlObject.celldlSvgElement!.svgElement, styling.pathStyle as PathStyling)
        }
    }

    styleRules(): string {
        return ''
    }

    svgDefinitions(): string {
        return ''
    }

}

//==============================================================================
//==============================================================================
