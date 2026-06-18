//==========================================================================

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
}

//==========================================================================
//==========================================================================
