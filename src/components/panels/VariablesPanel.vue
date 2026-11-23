<template lang="pug">
    ToolPanel
        template(#title)
            div {{ title }}
        template(#content)
            div(v-if="variables.length === 0") The diagram has no bond elements.
            table.variables(v-else)
                tr
                    th Element
                    th Variable
                    th Name
                    th Value
                tr(v-for="v in variables" :key="v.name")
                    td {{ v.element }}
                    td {{ v.name }}
                    td
                        input(
                            type="text"
                            spellcheck="false"
                            :class="{ invalid: invalid.has(v.name) }"
                            :value="names.mapping()[v.name]?.name ?? ''"
                            :placeholder="v.name"
                            @change="rename(v.name, ($event.target as HTMLInputElement).value.trim())"
                        )
                    td
                        input(
                            type="text"
                            spellcheck="false"
                            :class="{ invalid: invalidValues.has(v.name) }"
                            :value="names.values()[v.name]?.value ?? ''"
                            :placeholder="v.value ?? ''"
                            :title="v.units"
                            @change="setValue(v.name, ($event.target as HTMLInputElement).value.trim())"
                        )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import type { BondgraphVariable } from '#root/plugins/bondgraph'
import { VALID_CELLML_NAME } from '#root/utils/cellml'
import { VARIABLE_NAMES_KEY, type VariableNames } from '#root/utils/editor-types'

import ToolPanel from './ToolPanel.vue'

//==============================================================================

defineProps<{
    title: string
    toolId: string
}>()

const names = vue.inject(VARIABLE_NAMES_KEY) as VariableNames

const variables = vue.ref<BondgraphVariable[]>([])
const invalid = vue.ref<Set<string>>(new Set())
const invalidValues = vue.ref<Set<string>>(new Set())

vue.onMounted(() => {
    variables.value = names.variables()
})

//==============================================================================

function rename(variable: string, name: string) {
    const mapping = names.mapping()
    const taken = variables.value.filter(v => v.name !== variable)
                                 .map(v => mapping[v.name]?.name || v.name)
    if (name !== '' && (!VALID_CELLML_NAME.test(name) || taken.includes(name))) {
        invalid.value.add(variable)
        return
    }
    invalid.value.delete(variable)
    names.rename(variable, name)
}

function setValue(variable: string, value: string) {
    const number = Number(value)
    if (value !== '' && !Number.isFinite(number)) {
        invalidValues.value.add(variable)
        return
    }
    invalidValues.value.delete(variable)
    names.setValue(variable, (value === '') ? undefined : number)
}
</script>

<style scoped>
.variables {
    width: 100%;
}
.variables th {
    text-align: left;
}
.variables input {
    width: 100%;
    border: 1px solid var(--p-card-color);
}
.variables input.invalid {
    border-color: red;
}
</style>
