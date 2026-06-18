//==========================================================================

import type { CellDLConnectedObject, CellDLObject } from "@editor/celldlObjects"
import { getTemplateEventDetails } from "@editor/components"
import { PathMaker } from "@editor/connections/pathmaker"
import type { CellDLDiagram } from "@editor/diagram"
import { CellDLEditor, EDITOR_STATE } from "@editor/editor"
import type { EditorFrame } from "@editor/editor/editorframe"
import { type PointLike, Point } from "@renderer/common/points"

//==========================================================================

export class TestCellDLEditor extends CellDLEditor {

    addComponent(templateId: string, posn: PointLike, debug: boolean=false): string|undefined {
        if (debug) {
            console.log(`ADD ${templateId} at ${posn}`)
        }
        let component: CellDLObject|null = null
//        this.editorState = EDITOR_STATE.AddComponent   // toolbar needs to change active button...
        const templateElement = document.getElementById(templateId) as HTMLImageElement
        if (templateElement) {
            const templateDetails = getTemplateEventDetails(templateId, templateElement, null)
            const addPosn = this.celldlDiagram?.svgToDomCoords(posn) as PointLike
            this.addComponentTemplate(addPosn, templateDetails)
            component = this.selectionSet.objects[0] as CellDLObject
        }
        this.unsetSelectedObjects()
//        this.editorState = EDITOR_STATE.Selecting      // revert to default state
        // assert have component with centroid === posn
        if (debug) {
            console.log(' -->', component?.id, component?.celldlSvgElement?.centroid)
        }
        return component?.id
    }

    addConnection(sourceId: string, targetId: string, style: string='rectilinear', pathPoints: PointLike[]=[]) {
        const sourceObject = this.celldlDiagram?.objectById(sourceId)
        const targetObject = this.celldlDiagram?.objectById(targetId)
        if (sourceObject && targetObject) {
            // Get the boundary points that are the closest to the other object
            const startNode = PathMaker.validStartObject(sourceObject)
            const firstPoint = pathPoints.length ? pathPoints.at(0) : targetObject.celldlSvgElement?.centroid
            const startBoundary = sourceObject.celldlSvgElement?.boundaryIntersections(firstPoint as PointLike)[0]
            const lastPoint = pathPoints.length ? pathPoints.at(-1) : sourceObject.celldlSvgElement?.centroid
            const targetBoundary = targetObject.celldlSvgElement?.boundaryIntersections(lastPoint as PointLike)[0]
            if (startNode && startBoundary && targetBoundary) {
                const pathMaker = new PathMaker(this.editorFrame as EditorFrame, startNode, style)
                pathMaker.addPoint(startBoundary)
                for (const point of pathPoints) {
                    pathMaker.drawTo(point)
                    pathMaker.addPoint(point)
                }
                pathMaker.drawTo(targetBoundary)
                const endNode = pathMaker.validPathNode(targetObject)
                if (endNode) {
                    pathMaker.finishPath(endNode, this.celldlDiagram as CellDLDiagram)
                }
            }
        }
    }

    moveComponent(id: string, offset: PointLike, debug: boolean=false) {
        this.editorState = EDITOR_STATE.Selecting      // toolbar needs to change active button...
        const currentObject = this.celldlDiagram?.objectById(id) as CellDLConnectedObject
        if (currentObject) {
            // pointer over
            const element = currentObject.celldlSvgElement?.svgElement as SVGGraphicsElement
            currentObject.initialiseMove(element)  // will set moveable
            this.currentObject = currentObject
            // mouse down
            const startPosn = Point.fromPoint(currentObject.celldlSvgElement?.centroid as PointLike)
            currentObject.startMove(startPosn)
            const movePosn = startPosn.add(offset)
            if (debug) {
                console.log(`MOVE ${id} from`, startPosn, 'to', movePosn)
            }
            this.moving = true
            this.moved = false
            // pointer move
            this.pointerMoved = true
            currentObject.move(movePosn)
            this.moved = true
            // mouse up
            currentObject.endMove()
            currentObject.finaliseMove()
            this.moving = false
            if (debug) {
                console.log(' -->', currentObject?.id, currentObject?.celldlSvgElement?.centroid)
            }
        }
        // assert component's centroid === posn
    }

    moveComponents(ids: string[], offset: PointLike) {
        this.editorState = EDITOR_STATE.Selecting      // toolbar needs to change active button...
        this.unsetSelectedObjects()
        if (ids.length) {
            const currentObject = this.celldlDiagram?.objectById(ids[0] as string) as CellDLConnectedObject
            if (currentObject) {
                this.currentObject = currentObject
                const startPosn = Point.fromPoint(currentObject.celldlSvgElement?.centroid as PointLike)
                const movePosn = startPosn.add(offset)
                this.setSelectedObject(currentObject)
                for (const id of ids.slice(1)) {
                    const object = this.celldlDiagram?.objectById(id) as CellDLConnectedObject
                    if (object) {
                        this.setSelectedObject(object)
                    }
                }
                this.selectionSet.startMove(startPosn, currentObject)
                this.moving = true
                this.moved = false
                // pointer move
                this.pointerMoved = true
                this.selectionSet.move(movePosn)
                this.moved = true
                // mouse up
                this.selectionSet.endMove()
                for (const object of this.selectionSet.objects ||[]) {
                    if (object.id !== this.currentObject?.id) {
                        object.finaliseMove()
                    }
                }
            this.unsetSelectedObjects()
            this.moving = false
            }
        }
    }
}

//==========================================================================
//==========================================================================
