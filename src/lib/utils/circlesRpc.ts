/**
 * Utility functions for interacting with Circles RPC network
 */

export interface CirclesRpcProfile {
  address: string
  name?: string
  previewImageUrl?: string
  avatarType?: string
}

interface CirclesRpcResponse {
  jsonrpc: string
  result?: CirclesRpcProfile
  error?: {
    code: number
    message: string
  }
  id: number
}

const CIRCLES_RPC_URL = 'https://rpc.circlesubi.network/'

/**
 * Fetches profile data from the Circles network RPC
 * @param address - The safe address to lookup (will be converted to lowercase)
 * @returns Profile data if found, null otherwise
 */
export async function fetchCirclesProfile(
  address: string
): Promise<CirclesRpcProfile | null> {
  try {
    // Convert address to lowercase as required by the RPC
    const lowerCaseAddress = address.toLowerCase()

    const response = await fetch(CIRCLES_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'circles_getProfileByAddress',
        params: [lowerCaseAddress],
        id: 1,
      }),
    })

    if (!response.ok) {
      console.error('Circles RPC request failed:', response.statusText)
      return null
    }

    const data: CirclesRpcResponse = await response.json()

    if (data.error) {
      console.error('Circles RPC error:', data.error)
      return null
    }

    if (!data.result) {
      return null
    }

    return data.result
  } catch (error) {
    console.error('Error fetching profile from Circles RPC:', error)
    return null
  }
}
