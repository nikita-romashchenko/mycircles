import { writable } from "svelte/store"
import type { Relation } from "$lib/types"

export const myRelationData = writable<Relation[] | undefined>(undefined)
