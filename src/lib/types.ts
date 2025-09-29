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

interface MediaItem {
  _id: string
  url: string
}

interface PostProfile {
  _id: string
  name: string
  username: string
}

export interface Post {
  _id: string
  userId: PostProfile
  type: "image" | "video" | "album"
  caption: string
  createdAt: string
  mediaItems: MediaItem[]
  visibility: "public" | "private" | "friends"
  likesCount: number
  repostsCount: number
  isLiked: boolean
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
  relationItem: RelationItem
  profile?: RelationProfile
}
