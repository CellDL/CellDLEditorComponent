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

import type { CellDLObject } from '@editor/celldlObjects'
import type { CellDLDiagram } from '@editor/diagram'

import { Point, PointMath, type PointLike } from '@renderer/common/points'

import type { SelectionSet } from './selectionset'

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

//==============================================================================

class MoveDetails {
    // what is being moved; index > 0 ==> a connection's control point
    index: number = 0
    // where we've been moved to
    nextPosition: Point | null = null
    // where we've moved from
    prevPosition: Point | null = null
}

//==============================================================================

export class UndoState {
    #moveDetails: MoveDetails = new MoveDetails()
    #selection: SelectionSet|null = null

    constructor(
        readonly action: UndoAction,
        readonly undoObject: CellDLObject,
        options: UndoActionOptions={}
    ) {
        this.setOptions(options)
    }

    setOptions(options: UndoActionOptions) {
        this.#selection = options.selection || null
        if (this.action === UndoAction.MOVE) {
            this.#moveDetails.index = options.index || 0
        }
    }

    // also for a selectionSet of components and connections
// or is this simple done by iterating through the set? But not
// auto connections??

    get moveDetails() {
        return this.#moveDetails
    }

    startMove(options: UndoActionMoveOptions) {
        this.#moveDetails.index = options.index || 0
        if (options.position !== undefined) {
            this.#moveDetails.prevPosition = Point.fromPoint(options.position)
        }
    }

    endMove(position: PointLike|undefined) {
        if (position !== undefined) {
            this.#moveDetails.nextPosition = Point.fromPoint(position)
        }


    }

    redoMove(startPosition: PointLike, endPosition: PointLike) {
        if (this.action === UndoAction.MOVE
         && !PointMath.equals(startPosition, endPosition)) {
            if (this.#selection) {
                this.#selection.startMove(startPosition, this.undoObject)
                this.#selection.move(endPosition)
                this.#selection.endMove()
            } else if (!this.undoObject.isConnection) {
                this.undoObject.startMove(startPosition)
                this.undoObject.move(endPosition)
                this.undoObject.celldlDiagram.objectMoved(this.undoObject)
                this.undoObject.endMove()
            } else {
                // need control point index
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

    setActiveUndoState(action: UndoAction, undoObject: UndoObject, options: UndoActionOptions={}) {
        this.#activeUndoState = this.#newUndoState(action, undoObject, options)
        if (action === UndoAction.MOVE) {
            this.#activeUndoState.startMove(options)
        }
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

    #newUndoState(action: UndoAction, undoObject: UndoObject): UndoState {
        return this.#pushUndoStack(new UndoState(action, undoObject), false)
    }

    redo(diagram: CellDLDiagram) {
        const undoState = this.#popRedoStack()
        if (undoState) {
            this.#pushUndoStack(undoState, true)
            if (undoState.action === UndoAction.DELETE) {
                diagram.undoObjectDelete(undoState)
            } else if (undoState.action === UndoAction.INSERT) {
                diagram.undoObjectInsert(undoState)
            } else if (undoState.action === UndoAction.MOVE) {
                const position = undoState.moveDetails.nextPosition
                const startPosition = undoState.moveDetails.prevPosition
                if (position && startPosition) {

                    for (const object of undoState.storedObjects) {
                        object.celldlObject.celldlSvgElement?.reposition(position, {
                            controlPointIndex: undoState.moveDetails.index,
                            startPosition: startPosition
                        })
                    }


                }
                // via diagram to update spatial index??
//                diagram.undoObjectMove(undoState, MovePosition.CURRENT)
//                undoState.storedObjects[0]?.celldlObject.undoControlMove(undoState.moveDetails(MovePosition.CURRENT))
            }
        }
    }

    undo(diagram: CellDLDiagram) {
        const undoState = this.#popUndoStack()
        if (undoState) {
            this.#pushRedoStack(undoState)
            if (undoState.action === UndoAction.DELETE) {
                diagram.undoObjectInsert(undoState)
            } else if (undoState.action === UndoAction.INSERT) {
                diagram.undoObjectDelete(undoState)
            } else if (undoState.action === UndoAction.MOVE) {
                const position = undoState.moveDetails.prevPosition
                const startPosition = undoState.moveDetails.nextPosition
                if (position && startPosition) {
                    for (const object of undoState.storedObjects) {
                        object.celldlObject.celldlSvgElement?.reposition(position, {
                            controlPointIndex: undoState.moveDetails.index,
                            startPosition: startPosition
                        })
                    }
                }
                // via diagram to update spatial index??
            }
        }
    }
/*
    // to be replaced by calling setActiveUndoState
    deleteObject(celldlObject: CellDLObject, rdfStore: RdfStore): UndoState {
        const undoState = this.#newUndoState(UndoAction.INSERT)
        undoState.storeObject(celldlObject, rdfStore)
        return undoState
    }

    // to be replaced by calling setActiveUndoState
    insertObject(celldlObject: CellDLObject, rdfStore: RdfStore): UndoState {
        const undoState = this.#newUndoState(UndoAction.DELETE)
        undoState.storeObject(celldlObject, rdfStore)
        return undoState
    }
*/
//    undoMoveAction(): UndoState {
//        return this.#newUndoState(UndoAction.MOVE)
//    }
}

//==============================================================================

export const undoRedo = UndoRedo.instance

//==============================================================================
