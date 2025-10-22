import { json } from "@sveltejs/kit"
import { fetchCirclesProfilesBatch } from "$lib/utils/circlesRpc"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { addresses } = await request.json()

    if (!Array.isArray(addresses)) {
      return json({ error: "addresses must be an array" }, { status: 400 })
    }

    const profiles = await fetchCirclesProfilesBatch(addresses)

    return json({ profiles })
  } catch (error) {
    console.error("Error fetching batch profiles:", error)
    return json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    )
  }
}
