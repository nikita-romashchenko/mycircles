import { json } from "@sveltejs/kit"
import type { RequestEvent } from "./$types"

export async function POST({ request, locals }: RequestEvent) {
  try {
    // TODO: Implement untrust logic

    return json({ success: true }, { status: 200 })
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 400 })
  }
}
