import type { Relation } from "$lib/types"
export const globalState = $state<{ relations: Relation[] }>({ relations: [] })
