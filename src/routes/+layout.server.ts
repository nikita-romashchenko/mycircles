import { getFilteredRelationsWithProfiles } from "$lib/server/relations"
import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import type { Relation } from "$lib/types"

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth()
  const pathname = event.url.pathname
  let relationsWithProfiles: Relation[] | undefined = undefined

  if (session?.user && !session.user.username) {
    if (
      !pathname.startsWith("/registration") &&
      !pathname.startsWith("/signout") &&
      !pathname.startsWith("/api/auth")
    ) {
      //@todo improve the redirect logic
    }
  }

  return {
    session,
  }
}
