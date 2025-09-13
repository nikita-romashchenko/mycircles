import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/sveltekit/providers/google"
import { env } from "$env/dynamic/private"

import mongoose from 'mongoose'

// Connect to MongoDB
mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// Define Profile Schema
const ProfileSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  safeAddress: { type: String, default: '0x' },
  description: { type: String, default: '' },
  avatarImageUrl: { type: String, default: '' },
  location: { type: String, default: '' },
  links: [{
    name: { type: String },
    icon: { type: String },
    link: { type: String }
  }],
  type: { 
    type: String, 
    enum: ['Open', 'Private'], 
    default: 'Open' 
  }
})
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema)

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  providers: [
    Google
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if user exists in MongoDB
        const existingProfile = await Profile.findOne({ email: user.email })
        
        if (!existingProfile) {
          // Redirect to registration if user doesn't exist
          console.log("User doesn't exist, should redirect to registration");
          return true;
          //return `/register?email=${encodeURIComponent(user.email)}`
        }

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      // This runs whenever a JWT is created, updated, or accessed
      console.log("userdata", user)
      if (user) {
        // First time sign in - fetch profile data and add to token
        try {
          const existingProfile = await Profile.findOne({ email: user.email })
          
          if (existingProfile) {
            token.profileId = existingProfile._id.toString()
            token.safeAddress = existingProfile.safeAddress
          }
        } catch (error) {
          console.error('Error fetching profile in jwt callback:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.profileId = token.profileId
        session.user.safeAddress = token.safeAddress
      }
      console.log('Session with custom data:', session)
      return session
    }
  }
})
