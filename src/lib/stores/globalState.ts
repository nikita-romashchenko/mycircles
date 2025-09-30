import type { Relation } from "$lib/types"

class GlobalState {
  myRelationData = $state<Relation[] | undefined>(undefined)

  setMyRelationData(data: Relation[] | undefined) {
    this.myRelationData = data
  }

  clearMyRelationData() {
    this.myRelationData = undefined
  }
}

export const globalState = new GlobalState()
