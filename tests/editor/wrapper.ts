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

    addComponent(templateId: string, posn: PointLike, debug: boolean=false): CellDLObject|undefined {
        if (debug) {
            console.log(`ADD ${templateId} at ${posn}`)
        }
        let component: CellDLObject|undefined
        const templateElement = document.getElementById(templateId) as HTMLImageElement
        if (templateElement) {
            const templateDetails = getTemplateEventDetails(templateId, templateElement, null)
            const addPosn = this.celldlDiagram?.svgToDomCoords(posn) as PointLike
            this.addComponentTemplate(addPosn, templateDetails)
            component = this.selectionSet.objects[0] as CellDLObject
        }
        this.unsetSelectedObjects()
        // assert have component with centroid === posn
        if (debug) {
            console.log(' -->', component?.id, component?.celldlSvgElement?.centroid)
        }
        return component
    }

    addConnection(source?: CellDLObject, target?: CellDLObject, style: string='rectilinear', pathPoints: PointLike[]=[]) {
        if (source && target) {
            // Get the boundary points that are the closest to the other object
            const startNode = PathMaker.validStartObject(source)
            const firstPoint = pathPoints.length ? pathPoints.at(0) : target.celldlSvgElement?.centroid
            const startBoundary = source.celldlSvgElement?.boundaryIntersections(firstPoint as PointLike)[0]
            const lastPoint = pathPoints.length ? pathPoints.at(-1) : source.celldlSvgElement?.centroid
            const targetBoundary = target.celldlSvgElement?.boundaryIntersections(lastPoint as PointLike)[0]
            if (startNode && startBoundary && targetBoundary) {
                const pathMaker = new PathMaker(this.editorFrame as EditorFrame, startNode, style)
                pathMaker.addPoint(startBoundary)
                for (const point of pathPoints) {
                    pathMaker.drawTo(point)
                    pathMaker.addPoint(point)
                }
                pathMaker.drawTo(targetBoundary)
                const endNode = pathMaker.validPathNode(target)
                if (endNode) {
                    pathMaker.finishPath(endNode, this.celldlDiagram as CellDLDiagram)
                }
            }
        }
    }

    moveComponent(component: CellDLConnectedObject, offset: PointLike, debug: boolean=false) {
        this.editorState = EDITOR_STATE.Selecting      // toolbar needs to change active button...
        // pointer over
        const element = component.celldlSvgElement?.svgElement as SVGGraphicsElement
        component.initialiseMove(element)  // will set moveable
        this.currentObject = component
        // mouse down
        const startPosn = Point.fromPoint(component.celldlSvgElement?.centroid as PointLike)
        component.startMove(startPosn)
        const movePosn = startPosn.add(offset)
        if (debug) {
            console.log(`MOVE ${id} from`, startPosn, 'to', movePosn)
        }
        this.moving = true
        this.moved = false
        // pointer move
        this.pointerMoved = true
        component.move(movePosn)
        this.moved = true
        // mouse up
        component.endMove()
        component.finaliseMove()
        this.moving = false
        if (debug) {
            console.log(' -->', component?.id, component?.celldlSvgElement?.centroid)
        }
        // assert component's centroid === posn
    }

    moveComponents(components: CellDLConnectedObject[], offset: PointLike) {
        this.editorState = EDITOR_STATE.Selecting      // toolbar needs to change active button...
        this.unsetSelectedObjects()
        if (components.length) {
            const currentObject = components[0]
            if (currentObject) {
                this.currentObject = currentObject
                const startPosn = Point.fromPoint(currentObject.celldlSvgElement?.centroid as PointLike)
                const movePosn = startPosn.add(offset)
                this.setSelectedObject(currentObject)
                for (const component of components.slice(1)) {
                    this.setSelectedObject(component)
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
