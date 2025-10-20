import type { TrustRelationRow } from "@circles-sdk/sdk"

export interface ProfileLink {
  name: string
  icon: string
  link: string
}

export interface Profile {
  _id: string
  name: string
  username?: string
  email: string
  safeAddress: string
  description: string
  avatarImageUrl: string
  location: string
  links: ProfileLink[]
  type: "Open" | "Private"
}

// Profile data from Circles RPC network
export interface CirclesRpcProfile {
  address: string
  name?: string
  previewImageUrl?: string
  avatarType?: string
  isRpcProfile: true // Flag to identify RPC profiles
}

interface MediaItem {
  _id: string
  url: string
}

export interface Post {
  _id: string
  // New address-based fields
  creatorAddress: string
  postedToAddress?: string
  postedToProfile?: CirclesRpcProfile
  creatorProfile?: {
    _id: string
    name: string
    username: string
    safeAddress: string
  }

  // Old fields - kept for backward compatibility with populated data
  userId?: {
    _id: string
    name: string
    username: string
    safeAddress: string
  }
  postedTo?: {
    _id: string
    name: string
    username: string
    safeAddress: string
  }
  type: "image" | "video" | "album" | "text"
  caption: string
  createdAt: string
  mediaItems: MediaItem[]
  visibility: "public" | "private" | "friends"
  likesCount: number
  repostsCount: number
  isLiked: boolean
  balance: number
}

export interface RelationProfile {
  safeAddress: string
  username: string
  profileId: string
}

export interface RelationItem {
  subjectAvatar: string
  relation: string
  objectAvatar: string
  timestamp: number
  versions: number[]
  versionSpecificRelations: Record<string, string>
}

// add profile picture link later
export interface Relation {
  relationItem: TrustRelationRow
  profile?: RelationProfile
}
