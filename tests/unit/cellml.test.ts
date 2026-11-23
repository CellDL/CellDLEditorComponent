import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { describe, expect, test } from 'bun:test'

import { applyCellMLParameterValues, renameCellMLVariables } from '../../src/utils/cellml'

Object.assign(globalThis, { DOMParser, XMLSerializer })

//==============================================================================

const CELLML = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.cellml.org/cellml/2.0#" name="m">
  <component name="a">
    <variable name="q_A" units="mol" initial_value="1"/>
    <variable name="v_A" units="mol_per_s"/>
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <apply><eq/><apply><diff/><bvar><ci>t</ci></bvar><ci>q_A</ci></apply><ci> v_A </ci></apply>
    </math>
  </component>
  <component name="b">
    <variable name="q_A" units="mol"/>
  </component>
  <connection component_1="a" component_2="b">
    <map_variables variable_1="q_A" variable_2="q_A"/>
  </connection>
</model>`

describe('renameCellMLVariables', () => {
    test('renames variables, connections and MathML', () => {
        const cellml = renameCellMLVariables(CELLML, { q_A: { name: 'n_A' }, v_A: { name: 'dndt_A', latex: '\\dot{n}_A' } })
        expect(cellml.startsWith('<?xml')).toBe(true)
        expect(cellml).not.toContain('q_A')
        expect(cellml).not.toContain('v_A')
        expect(cellml.match(/name="n_A"/g)?.length).toBe(2)
        expect(cellml).toContain('variable_1="n_A" variable_2="n_A"')
        expect(cellml).toContain('<ci>n_A</ci>')
        expect(cellml).toContain('<ci>dndt_A</ci>')
        expect(cellml).toContain('<ci>t</ci>')
    })
    test('leaves CellML alone without renames', () => {
        expect(renameCellMLVariables(CELLML, { q_A: { name: 'q_A' } })).toBe(CELLML)
    })
    test('refuses clashing and invalid names', () => {
        expect(() => renameCellMLVariables(CELLML, { q_A: { name: 'v_A' } })).toThrow(/two `v_A`/)
        expect(() => renameCellMLVariables(CELLML, { q_A: { name: '2q' } })).toThrow(/Invalid/)
    })
})

describe('applyCellMLParameterValues', () => {
    test('sets initial values and leaves other variables alone', () => {
        const cellml = applyCellMLParameterValues(CELLML, { q_A: { value: 2.5, units: 'mol' }, v_A: { value: 3 } })
        expect(cellml).toContain('name="q_A" units="mol" initial_value="2.5"')
        expect(cellml).not.toContain('initial_value="3"')
        expect(cellml.match(/initial_value/g)?.length).toBe(1)
    })
    test('refuses mismatched units', () => {
        expect(() => applyCellMLParameterValues(CELLML, { q_A: { value: 2, units: 'mM' } })).toThrow(/units/)
    })
})
