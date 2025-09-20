import { json, error } from "@sveltejs/kit"
import { CirclesData, CirclesRpc } from "@circles-sdk/data"
import { Profiles } from "@circles-sdk/profiles"

export async function GET({ locals }) {
  const session = await locals.auth()

  if (!session?.user) {
    throw error(401, "Not authenticated")
  }

  // Initialize the CirclesData instance
  const rpc = new CirclesRpc("https://rpc.aboutcircles.com/")
  const circlesData = new CirclesData(rpc)
  // const result = await circlesData.getAggregatedTrustRelations(
  //   // @ts-ignore
  //   "0xc7d3dF890952a327Af94D5Ba6fdC1Bf145188a1b".toLowerCase(),
  //   2,
  // )

  // const result = await circlesData.getAvatarInfoBatch(
  //   // @ts-ignore
  //   [
  //     "0xc7d3dF890952a327Af94D5Ba6fdC1Bf145188a1b",
  //     "0x4C0929B5fe52531B760B02965B4a762b6ac816b8",
  //   ],
  // )

  return json({
    message: `Hello ${session.user.name || session.user.email}!`,
    user: session.user,
  })
}
