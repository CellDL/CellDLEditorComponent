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

import type { NormalArray } from 'svg-path-commander'

import { type CellDLConnection, CellDLObject } from '@editor/celldlObjects'
import type { CellDLDiagram } from '@editor/diagram'
import type { SvgConnection } from '@editor/SVGElements/svgconnection'

import { Point, PointMath, type PointLike } from '@renderer/common/points'

import { SelectionSet } from './selectionset'
import { StoredObject } from './storedobject'

//==============================================================================

export enum UndoAction {
    DELETE = 1,
    INSERT = 2,
    MOVE = 3
}

export type UndoActionOptions = {
    index?: number
    position?: PointLike
    selection?: SelectionSet
}

export type UndoObject = CellDLObject | SelectionSet

//==============================================================================

export class UndoState {
    #selectionSet: SelectionSet|null = null
    #storedObjects: Map<string, StoredObject> = new Map()

    constructor(
        readonly action: UndoAction,
        readonly undoObject: UndoObject,
        options: UndoActionOptions={}
    ) {
        const saveKnowledge = action !== UndoAction.MOVE
        if (undoObject instanceof CellDLObject) {
            this.#storedObjects.set(undoObject.id, new StoredObject(undoObject, saveKnowledge))
        }
        if (options.selection) {
            this.#selectionSet = options.selection
        } else if (undoObject instanceof SelectionSet) {
            this.#selectionSet = undoObject
        }
        if (this.#selectionSet) {
            for (const object of this.#selectionSet.objects) {
                this.#storedObjects.set(object.id, new StoredObject(object, saveKnowledge))
            }
        }
    }

    protected get selectionSet() {
        return this.#selectionSet
    }

    get storedObjects() {
        return this.#storedObjects
    }

    setOptions(_options: UndoActionOptions) {
    }

    storeObject(celldlObject: CellDLObject) {
        this.#storedObjects.set(celldlObject.id,
            new StoredObject(celldlObject, this.action !== UndoAction.MOVE))
    }

    // also for a selectionSet of components and connections
// or is this simple done by iterating through the set? But not
// auto connections??


}

//==============================================================================

type Direction = 'backwards' | 'forwards'

//==============================================================================

export class MoveUndoState extends UndoState {
    #nextPosition: Point | null = null
    #pathElementPathArrays: NormalArray[] = []
    #prevPosition: Point | null = null

    constructor(
        readonly undoObject: UndoObject,
        options: UndoActionOptions={}
    ) {
        super(UndoAction.MOVE, undoObject, options)
        const movedObject = this.undoObject as CellDLObject
        if (movedObject.isConnection) {
            const pathElements = ((movedObject as CellDLConnection).celldlSvgElement as SvgConnection)?.pathElements
            this.#pathElementPathArrays = pathElements.map(pathElement => pathElement.pathArray)
        }
        this.#startMove(options.position, options)
    }

    #startMove(position: PointLike|undefined, _options: UndoActionOptions) {
        if (position !== undefined) {
            this.#prevPosition = Point.fromPoint(position)
        }
    }

    endMove(position: PointLike|undefined) {
        if (position !== undefined) {
            this.#nextPosition = Point.fromPoint(position)
        }
    }

    reposition(direction: Direction) {
        const movedObject = this.undoObject as CellDLObject
        if (movedObject.isConnection) {
            const pathElements = ((movedObject as CellDLConnection).celldlSvgElement as SvgConnection)?.pathElements
            pathElements.forEach((pathElement, index) => {
                // biome-ignore lint/style/noNonNullAssertion: index is in range
                pathElement.setPathPoints(this.#pathElementPathArrays[index]!)
            })
            movedObject.redraw()
        } else {
            const position = (direction === 'backwards') ? this.#prevPosition : this.#nextPosition
            const startPosition = (direction === 'backwards') ? this.#nextPosition : this.#prevPosition
            if (position && startPosition && !PointMath.equals(startPosition, position)) {
                const movedObject = this.undoObject as CellDLObject
                if (this.selectionSet) {
                    this.selectionSet.reposition(movedObject, startPosition, position)

                } else {
                    movedObject.reposition(startPosition, position)
                }
            }
        }
    }
}

//==============================================================================

class UndoRedo {
    static #instance: UndoRedo | null = null

    #activeUndoState: UndoState|null = null
    #redoStack: UndoState[] = []
    #undoStack: UndoState[] = []

    private constructor() {
        if (UndoRedo.#instance) {
            throw new Error('Use UndoRedo.instance instead of `new`')
        }
        UndoRedo.#instance = this
    }

    static get instance() {
        if (!UndoRedo.#instance) {
            UndoRedo.#instance = new UndoRedo()
        }
        return UndoRedo.#instance
    }

    get activeUndoState() {
        return this.#activeUndoState
    }

    clean() {
        this.#redoStack = []
        this.#undoStack = []
        // notify CLEAN
    }

    setActiveUndoState(action: UndoAction, undoObject: UndoObject, options: UndoActionOptions={}): UndoState {
        this.#activeUndoState = this.#newUndoState(action, undoObject, options)
        return this.#activeUndoState
    }

    setActiveStateOptions(options: UndoActionOptions) {
        if (this.#activeUndoState) {
            this.#activeUndoState.setOptions(options)
        }
    }

    #clearRedoStack() {
        if (this.#redoStack.length) {
            this.#redoStack = []
            // notify no REDO
        }
    }

    #popRedoStack(): UndoState | null {
        if (this.#redoStack.length) {
            const undoState = this.#redoStack.pop() || null
            if (this.#redoStack.length === 0) {
            // notify no REDO
            }
            return undoState
        }
        return null
    }

    #pushRedoStack(undoState: UndoState) {
        this.#redoStack.push(undoState)
        if (this.#redoStack.length === 1) {
            // notify can REDO
        }
    }

    #popUndoStack(): UndoState | null {
        if (this.#undoStack.length) {
            const undoState = this.#undoStack.pop() as UndoState
            if (this.#undoStack.length === 0) {
                // notify CLEAN
            }
            return undoState
        }
        return null
    }

    #pushUndoStack(undoState: UndoState, reDoing: boolean): UndoState {
        this.#undoStack.push(undoState)
        if (!reDoing) {
            this.#clearRedoStack() // Can no longer redo once there are new items
        }
        return undoState
    }

    #newUndoState(action: UndoAction, undoObject: UndoObject, options: UndoActionOptions): UndoState {
        const undoState = (action === UndoAction.MOVE) ? new MoveUndoState(undoObject, options)
                                                       : new UndoState(action, undoObject, options)
        this.#pushUndoStack(undoState, false)
        return undoState
    }

    redo(diagram: CellDLDiagram) {
        const undoState = this.#popRedoStack()
        if (undoState) {
            this.#pushUndoStack(undoState, true)
            if (undoState.action === UndoAction.DELETE) {
                diagram.undoInsert(undoState)
            } else if (undoState.action === UndoAction.INSERT) {
                diagram.undoDelete(undoState)
            } else if (undoState.action === UndoAction.MOVE) {
                (undoState as MoveUndoState).reposition('forwards')
            }
        }
    }

    undo(diagram: CellDLDiagram) {
        const undoState = this.#popUndoStack()
        if (undoState) {
            this.#pushRedoStack(undoState)
            if (undoState.action === UndoAction.DELETE) {
                diagram.undoDelete(undoState)
            } else if (undoState.action === UndoAction.INSERT) {
                diagram.undoInsert(undoState)
            } else if (undoState.action === UndoAction.MOVE) {
                (undoState as MoveUndoState).reposition('backwards')
            }
        }
    }
}

//==============================================================================

export const undoRedo = UndoRedo.instance

//==============================================================================
