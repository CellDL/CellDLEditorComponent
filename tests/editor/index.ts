//==========================================================================

import type { TestCellDLEditor } from "./wrapper"

export { TestCellDLEditor } from "./wrapper"

//==========================================================================

export function testEditor(testEditor: TestCellDLEditor) {
    const X = 400, Y = 200, gap = 100
    const oneNode0 = testEditor.addComponent('bondgraph-components/OneNode', { x: X, y: Y }) as string
    const oneNode1 = testEditor.addComponent('bondgraph-components/OneNode', { x: X + gap, y: Y + gap }) as string
    const zeroNode0 = testEditor.addComponent('bondgraph-components/ZeroNode', { x: X + gap , y: Y }) as string
    const zeroNode1 = testEditor.addComponent('bondgraph-components/ZeroNode', { x: X + 2*gap, y: Y + gap }) as string
    const quantityStore = testEditor.addComponent('bondgraph-components/QuantityStore', { x: X + gap, y: Y - gap }) as string
    testEditor.addConnection(oneNode0, zeroNode0)
    testEditor.addConnection(zeroNode0, quantityStore) //, 'rectilinear', [{x: X + gap, y: Y }])
    testEditor.addConnection(zeroNode0, oneNode1)
    testEditor.addConnection(oneNode1, zeroNode1)

}

//==========================================================================
//==========================================================================
