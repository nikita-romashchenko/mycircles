import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/sveltekit/providers/google"
import Apple from "@auth/sveltekit/providers/apple"
import { env } from "$env/dynamic/private"
import type { DefaultSession } from "@auth/core/types"

import mongoose from 'mongoose'
import { Profile } from '$lib/models/Profile';

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      profileId?: string;
      safeAddress?: string;
      username?: string;
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    profileId?: string;
    safeAddress?: string;
    username?: string;
  }
}

// Connect to MongoDB
mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))


//TODO: Add apple provider
export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  providers: [
    Google({clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET}),
    Apple({clientId: env.AUTH_APPLE_ID, clientSecret: env.AUTH_APPLE_SECRET})
  ],
  secret: env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if user exists in MongoDB
        const existingProfile = await Profile.findOne({ email: user.email })

        if (!existingProfile) {
          // Create a temporary profile for new users so they can complete registration
          console.log("User doesn't exist, creating temporary profile");
          const tempProfile = new Profile({
            email: user.email,
            name: user.name || ''
            // username will be added during registration
          });
          await tempProfile.save();
          console.log("Temporary profile created, will redirect to registration");
        }

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
    async jwt({ token, user, trigger }) {
      // This runs whenever a JWT is created, updated, or accessed
      console.log("JWT callback - userdata:", user, "trigger:", trigger)

      // Always refresh profile data from database to get latest username
      if (token.email) {
        try {
          const existingProfile = await Profile.findOne({ email: token.email })

          if (existingProfile) {
            token.profileId = existingProfile._id.toString()
            token.safeAddress = existingProfile.safeAddress
            token.username = existingProfile.username
            console.log("JWT updated with profile data:", { username: token.username })
          }
        } catch (error) {
          console.error('Error fetching profile in jwt callback:', error)
        }
      }

      // Set email on first sign in
      if (user) {
        token.email = user.email
      }

      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.profileId = token.profileId
        session.user.safeAddress = token.safeAddress
        session.user.email = token.email || session.user.email
        session.user.username = token.username
      }
      console.log('Session with custom data:', session)
      return session
    }
  }
})
