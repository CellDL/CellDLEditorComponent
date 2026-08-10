//==========================================================================

import { undoRedo } from "#editor/diagram/undoredo"
import type { TestCellDLEditor } from "./wrapper"

export { TestCellDLEditor } from "./wrapper"

//==========================================================================

export function testEditor(editor: TestCellDLEditor) {
    const X = 400, Y = 200, gap = 100
    const oneNode0 = editor.addComponent('bondgraph-components/OneNode', { x: X, y: Y })
    const oneNode1 = editor.addComponent('bondgraph-components/OneNode', { x: X + gap, y: Y + gap })
    const zeroNode0 = editor.addComponent('bondgraph-components/ZeroNode', { x: X + gap , y: Y })
    const zeroNode1 = editor.addComponent('bondgraph-components/ZeroNode', { x: X + 2*gap, y: Y + gap })
    const quantityStore = editor.addComponent('bondgraph-components/QuantityStore', { x: X + gap, y: Y - gap })

    editor.addConnection(oneNode0, zeroNode0)
    editor.addConnection(zeroNode0, quantityStore) //, 'rectilinear', [{x: X + gap, y: Y }])
    editor.addConnection(zeroNode0, oneNode1)
    editor.addConnection(oneNode1, zeroNode1)

    editor.selectObjects([oneNode0, zeroNode0, oneNode1])

    editor.selectObject(oneNode1)

    undoRedo.clean()

    editor.moveComponent(zeroNode1, {x: 100, y: 40})

    // biome-ignore lint/style/noNonNullAssertion: we have a diagram
    undoRedo.undo(editor.celldlDiagram!)

    // biome-ignore lint/style/noNonNullAssertion: we have a diagram
    undoRedo.redo(editor.celldlDiagram!)
}

//==========================================================================
//==========================================================================
