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

import { type CellDLConnectedObject, type CellDLConnection, CellDLObject } from '#editor/celldlObjects'
import type { CellDLDiagram } from '#editor/diagram'
import type { SvgConnection } from '#editor/SVGElements/svgconnection'

import { Point, PointMath, type PointLike } from '#root/utils/points'

import { SelectionSet } from './selectionset'
import { StoredObject } from './storedobject'
import type { CellDLEditor } from '#editor/editor'

//==============================================================================

enum UndoAction {
    DELETE = 1,
    INSERT = 2,
    MOVE = 3,
    ARRANGE = 4
}

type UndoObject = CellDLObject | SelectionSet

//==============================================================================

export class UndoState {
    #selectionSet: SelectionSet|null = null
    #storedObjects: Map<string, StoredObject> = new Map()

    constructor(
        readonly action: UndoAction,
        readonly undoObject: UndoObject,
    ) {
        if (undoObject instanceof CellDLObject) {
            this.storeObject(undoObject)
        } else if (undoObject instanceof SelectionSet) {
            this.#selectionSet = undoObject
        }
        if (this.#selectionSet) {
            for (const object of this.#selectionSet.objects) {
                this.storeObject(object)
            }
        }
    }

    protected get selectionSet() {
        return this.#selectionSet
    }

    protected set selectionSet(selectionSet: SelectionSet|null) {
        this.#selectionSet = selectionSet
    }

    get storedObjects() {
        return this.#storedObjects
    }

    storeObject(celldlObject: CellDLObject) {
        if (!this.#storedObjects.has(celldlObject.id)) {
            this.#storedObjects.set(celldlObject.id,
                new StoredObject(celldlObject, this.action !== UndoAction.MOVE && this.action !== UndoAction.ARRANGE))
        }
    }
}

//==============================================================================

type Direction = 'backwards' | 'forwards'

//==============================================================================

type ConnectionPathArrayMap = Map<string, NormalArray[]>

function connectionPathArrays(connections: CellDLConnection[]): ConnectionPathArrayMap {
    const pathArrays: ConnectionPathArrayMap = new Map()
    for (const connection of connections) {
        const pathElements = (connection.celldlSvgElement as unknown as SvgConnection)?.pathElements
        pathArrays.set(connection.id, pathElements.map(pathElement => pathElement.pathArray))
    }
    return pathArrays
}

function setConnectionPathArray(connection: CellDLConnection, connectionPathArrays: ConnectionPathArrayMap) {
    const pathArrays = connectionPathArrays.get(connection.id)
    if (pathArrays) {
        connection.clearControlHandles()
        const pathElements = (connection.celldlSvgElement as unknown as SvgConnection)?.pathElements
        pathElements.forEach((pathElement, index) => {
            // biome-ignore lint/style/noNonNullAssertion: index is in range
            pathElement.setPathPoints(pathArrays[index]!)
            pathElement.redraw()
        })
    }
}

//==============================================================================

export class MoveUndoState extends UndoState {
    #nextPathArrays: ConnectionPathArrayMap | null = null
    #nextPosition: Point | null = null
    #prevPathArrays: ConnectionPathArrayMap = new Map()
    #prevPosition: Point

    constructor(
        readonly undoObject: CellDLObject,
        position: PointLike,
        selectionSet: SelectionSet|undefined
    ) {
        super(UndoAction.MOVE, undoObject)
        this.selectionSet = selectionSet || null
        this.#prevPathArrays = this.#connectionPathArrays()
        this.#prevPosition = Point.fromPoint(position)
    }

    #connectionPathArrays(): ConnectionPathArrayMap {
        const connectionPathArrays: ConnectionPathArrayMap = new Map()
        if (this.undoObject.isConnectable) {
            const component = <CellDLConnectedObject>this.undoObject
            for (const connection of component.connections) {
                const pathElements = (connection.celldlSvgElement as unknown as SvgConnection)?.pathElements
                const pathArrays = pathElements.map(pathElement => pathElement.pathArray)
                connectionPathArrays.set(connection.id, pathArrays)
            }
        } else if (this.undoObject.isConnection) {
            const connection = <CellDLConnection>this.undoObject
            const pathElements = (connection.celldlSvgElement as unknown as SvgConnection)?.pathElements
            const pathArrays = pathElements.map(pathElement => pathElement.pathArray)
            connectionPathArrays.set(connection.id, pathArrays)
        }
        return connectionPathArrays
    }

    endMove(position: PointLike|undefined) {
        if (position !== undefined) {
            this.#nextPathArrays = this.#connectionPathArrays()
            this.#nextPosition = Point.fromPoint(position)
        }
    }

    reposition(direction: Direction) {
        if (direction === 'backwards' && this.#nextPosition === null) {
            // restoring to original position without having moved
            this.#restoreConnectionPaths(this.#prevPathArrays)
        } else {
            const connectionPathArrays = (direction === 'backwards') ? this.#prevPathArrays : this.#nextPathArrays
            const position = (direction === 'backwards') ? this.#prevPosition : this.#nextPosition
            const startPosition = (direction === 'backwards') ? this.#nextPosition : this.#prevPosition
            if (position && startPosition && connectionPathArrays
             && !PointMath.equals(startPosition, position)) {
                const movedObject = this.undoObject as CellDLObject
                if (this.selectionSet) {
                    this.selectionSet.reposition(movedObject, startPosition, position)
                } else {
                    movedObject.reposition(startPosition, position)
                }
                this.#restoreConnectionPaths(connectionPathArrays)
            }
        }
    }

    #restoreConnectionPaths(pathArrays: ConnectionPathArrayMap) {
        if (this.undoObject.isConnectable) {
            const component = <CellDLConnectedObject>this.undoObject
            for (const connection of component.connections) {
                setConnectionPathArray(connection, pathArrays)
            }
        } else if (this.undoObject.isConnection) {
            setConnectionPathArray(<CellDLConnection>this.undoObject, pathArrays)
        }
    }
}

//==============================================================================

function centroids(objects: CellDLObject[]): Map<CellDLObject, Point> {
    const centroids: Map<CellDLObject, Point> = new Map()
    for (const object of objects) {
        if (object.celldlSvgElement) {
            centroids.set(object, Point.fromPoint(object.celldlSvgElement.centroid))
        }
    }
    return centroids
}

// Aligning or distributing objects, and straightening their paths

export class ArrangeUndoState extends UndoState {
    #connections: CellDLConnection[]
    #nextPathArrays: ConnectionPathArrayMap = new Map()
    #nextPositions: Map<CellDLObject, Point> = new Map()
    #prevPathArrays: ConnectionPathArrayMap
    #prevPositions: Map<CellDLObject, Point>

    constructor(readonly objects: CellDLObject[]) {
        // biome-ignore lint/style/noNonNullAssertion: there is at least one object
        super(UndoAction.ARRANGE, objects[0]!)
        this.#connections = [...new Set(objects.flatMap(object => object.connections))]
        this.#prevPathArrays = connectionPathArrays(this.#connections)
        this.#prevPositions = centroids(objects)
    }

    endArrange() {
        this.#nextPathArrays = connectionPathArrays(this.#connections)
        this.#nextPositions = centroids(this.objects)
    }

    restore(direction: Direction) {
        const [from, to] = (direction === 'backwards') ? [this.#nextPositions, this.#prevPositions]
                                                       : [this.#prevPositions, this.#nextPositions]
        for (const object of this.objects) {
            const start = from.get(object)
            const end = to.get(object)
            if (start && end && !PointMath.equals(start, end)) {
                object.reposition(start, end, { noAlign: true })
            }
        }
        const pathArrays = (direction === 'backwards') ? this.#prevPathArrays : this.#nextPathArrays
        for (const connection of this.#connections) {
            setConnectionPathArray(connection, pathArrays)
        }
    }
}

//==============================================================================

export class UndoRedo {
    #activeUndoState: UndoState|null = null
    #editor: CellDLEditor
    #redoStack: UndoState[] = []
    #undoStack: UndoState[] = []

    constructor(editor: CellDLEditor) {
        this.#editor = editor
    }

    get activeUndoState() {
        return this.#activeUndoState
    }

    clean() {
        this.#redoStack = []
        this.#undoStack = []
        this.#editor.diagramModified(false)     // clean
    }

    resetActiveUndoState() {
        if (this.#activeUndoState) {
            if (this.#undoStack.at(-1) === this.#activeUndoState) {
                this.#popUndoStack()
            }
            this.#activeUndoState = null
        }
    }

    setArrangeUndoState(objects: CellDLObject[]): ArrangeUndoState {
        return this.#setActiveUndoState(new ArrangeUndoState(objects)) as ArrangeUndoState
    }

    setDeleteUndoState(undoObject: UndoObject): UndoState {
        return this.#setActiveUndoState(new UndoState(UndoAction.DELETE, undoObject))
    }

    setInsertUndoState(undoObject: UndoObject): UndoState {
        return this.#setActiveUndoState(new UndoState(UndoAction.INSERT, undoObject))
    }

    setMoveUndoState(undoObject: UndoObject, position: PointLike, selectionSet: SelectionSet|undefined=undefined): MoveUndoState {
        return this.#setActiveUndoState(new MoveUndoState(undoObject as CellDLObject, position, selectionSet)) as MoveUndoState
    }

    #clearRedoStack() {
        if (this.#redoStack.length) {
            this.#redoStack = []
            this.#editor.canUndo(false)
        }
    }

    #popRedoStack(): UndoState | null {
        if (this.#redoStack.length) {
            const undoState = this.#redoStack.pop() || null
            if (this.#redoStack.length === 0) {
                this.#editor.canUndo(false)
            }
            return undoState
        }
        return null
    }

    #pushRedoStack(undoState: UndoState) {
        this.#redoStack.push(undoState)
        if (this.#redoStack.length === 1) {
            this.#editor.canUndo(true)
        }
    }

    #popUndoStack(): UndoState | null {
        if (this.#undoStack.length) {
            const undoState = this.#undoStack.pop() as UndoState
            if (this.#undoStack.length === 0) {
                this.#editor.diagramModified(false)     // clean
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

    #setActiveUndoState(undoState: UndoState): UndoState {
        this.#activeUndoState = undoState
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
            } else if (undoState.action === UndoAction.ARRANGE) {
                (undoState as ArrangeUndoState).restore('forwards')
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
            } else if (undoState.action === UndoAction.ARRANGE) {
                (undoState as ArrangeUndoState).restore('backwards')
            }
        }
    }
}

//==============================================================================
//==============================================================================
