/**
 * Utility functions for interacting with Circles RPC network
 */
import type { CirclesRpcProfile } from "$lib/types"

// export interface CirclesRpcProfile {
//   address: string
//   name?: string
//   previewImageUrl?: string
//   avatarType?: string
// }

interface CirclesRpcResponse {
  jsonrpc: string
  result?: CirclesRpcProfile
  error?: {
    code: number
    message: string
  }
  id: number
}

const CIRCLES_RPC_URL = "https://rpc.circlesubi.network/"

/**
 * Fetches profile data from the Circles network RPC
 * @param address - The safe address to lookup (will be converted to lowercase)
 * @returns Profile data if found, null otherwise
 */
export async function fetchCirclesProfile(
  address: string,
): Promise<CirclesRpcProfile | null> {
  try {
    // Convert address to lowercase as required by the RPC
    const lowerCaseAddress = address.toLowerCase()

    const response = await fetch(CIRCLES_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "circles_getProfileByAddress",
        params: [lowerCaseAddress],
        id: 1,
      }),
    })

    if (!response.ok) {
      console.error("Circles RPC request failed:", response.statusText)
      return null
    }

    const data: CirclesRpcResponse = await response.json()

    if (data.error) {
      console.error("Circles RPC error:", data.error)
      return null
    }

    if (!data.result) {
      return null
    }

    return data.result
  } catch (error) {
    console.error("Error fetching profile from Circles RPC:", error)
    return null
  }
}

/**
 * Fetches multiple profile data from the Circles network RPC
 * @param addresses - Array of safe addresses to lookup (will be converted to lowercase)
 * @returns Array of profile data (null for missing profiles)
 */
export async function fetchCirclesProfilesBatch(
  addresses: (string | null)[],
): Promise<(CirclesRpcProfile | null)[]> {
  try {
    // Convert all non-null addresses to lowercase as required by the RPC
    const lowerCaseAddresses = addresses.map(
      (addr) => addr?.toLowerCase() ?? null,
    )

    const response = await fetch(CIRCLES_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "circles_getProfileByAddressBatch",
        params: [lowerCaseAddresses],
        id: 1,
      }),
    })

    if (!response.ok) {
      console.error("Circles RPC request failed:", response.statusText)
      return addresses.map(() => null)
    }

    const data: {
      jsonrpc: string
      id: number
      result?: (CirclesRpcProfile | null)[]
      error?: any
    } = await response.json()

    if (data.error) {
      console.error("Circles RPC error:", data.error)
      return addresses.map(() => null)
    }

    if (!data.result) {
      return addresses.map(() => null)
    }

    return data.result
  } catch (error) {
    console.error("Error fetching profiles from Circles RPC:", error)
    return addresses.map(() => null)
  }
}
