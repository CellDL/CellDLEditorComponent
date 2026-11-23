<template lang="pug">
    ToolPanel
        template(#title)
            div {{ title }}
        template(#content)
            .panel-content
                p.hint Edit an equation and press Enter to change the bond graph.
                div(v-if="!reactions.length") The diagram has no reactions.
                .reaction(v-for="reaction in reactions" :key="reaction.id")
                    label {{ reaction.name }}
                    InputText(
                        v-model="reaction.text"
                        size="small"
                        fluid
                        @keydown.enter="apply(reaction)"
                        @keydown.escape="refresh"
                    )
                    .error(v-if="errors[reaction.id]") {{ errors[reaction.id] }}
                .reaction
                    label New reaction
                    InputText(v-model="newName" size="small" fluid placeholder="Name")
                    InputText(
                        v-model="newText"
                        size="small"
                        fluid
                        placeholder="Glc[c] + ATP[c] ⇌ G6P[c] + ADP[c]"
                        @keydown.enter="add"
                    )
                    .error(v-if="errors.new") {{ errors.new }}
</template>

<script setup lang="ts">
import * as vue from 'vue'

import ToolPanel from '#root/components/panels/ToolPanel.vue'
import { EDITOR_KEY } from '#root/utils/editor-types'

import { equationText } from './equations'
import { ReactionEditor, reactionEquations } from './reactions'
import { type BondgraphPlugin, PLUGIN_ID } from '.'

//==============================================================================

const props = defineProps<{
    title: string
    toolId: string
}>()

// biome-ignore lint/style/noNonNullAssertion: the editor provides itself
const editor = vue.inject(EDITOR_KEY)!

const reactions = vue.ref<{ id: string, name: string, text: string }[]>([])
const errors = vue.ref<Record<string, string>>({})
const newName = vue.ref('')
const newText = vue.ref('')

//==============================================================================

function refresh() {
    const diagram = editor.celldlDiagram
    reactions.value = diagram ? reactionEquations(diagram).map(eq => ({
        id: eq.id,
        name: eq.name,
        text: equationText(eq)
    })) : []
}

async function edit(id: string, change: (reactionEditor: ReactionEditor) => Promise<void>) {
    const diagram = editor.celldlDiagram
    const plugin = editor.componentLibraryPlugin.getPlugin(PLUGIN_ID) as BondgraphPlugin|undefined
    if (diagram && plugin) {
        errors.value = {}
        try {
            await change(new ReactionEditor(diagram, plugin))
        } catch (error) {
            errors.value = { [id]: (error as Error).message }
            return false
        }
        refresh()
    }
    return true
}

async function apply(reaction: { id: string, text: string }) {
    await edit(reaction.id, reactionEditor => reactionEditor.applyEquation(reaction.id, reaction.text))
}

async function add() {
    if (await edit('new', reactionEditor => reactionEditor.addReaction(newText.value, newName.value.trim()))) {
        newName.value = ''
        newText.value = ''
    }
}

// Read the diagram when the panel opens and after it changes
function toolbarEvent(event: Event) {
    const detail = (<CustomEvent>event).detail
    if (detail.type === 'state' && detail.source === props.toolId && detail.value) {
        refresh()
    }
}

vue.onMounted(() => {
    refresh()
    editor.events.addEventListener('file-edited', refresh)
    editor.events.addEventListener('toolbar-event', toolbarEvent)
})

vue.onUnmounted(() => {
    editor.events.removeEventListener('file-edited', refresh)
    editor.events.removeEventListener('toolbar-event', toolbarEvent)
})
</script>

<style scoped>
.hint, .error {
    font-size: 0.8rem;
}
.reaction {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.75rem;
}
.error {
    color: var(--p-red-500);
}
</style>
