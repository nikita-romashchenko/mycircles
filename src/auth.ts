import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/sveltekit/providers/google"
import type { Provider } from "@auth/sveltekit/providers"

import Credentials from "@auth/sveltekit/providers/credentials"
import { env } from "$env/dynamic/private"
import type { DefaultSession } from "@auth/core/types"

import mongoose from 'mongoose'
import { Profile } from '$lib/models/Profile';
import { authService } from '$lib/services/AuthService';

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      profileId?: string;
      safeAddress?: string;
      username?: string;
      controllingEOA?: string;
      sessionType?: 'oauth2' | 'metamask' | 'privatekey';
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    profileId?: string;
    safeAddress?: string;
    username?: string;
    controllingEOA?: string;
  }
}

// Connect to MongoDB
mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

console.log('Initializing SvelteKitAuth with providers...');

export const { handle, signIn, signOut } = SvelteKitAuth({
  session: {
    strategy: "jwt"
  },
  trustHost: true,
  providers: [
    Google({clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET}),
    // Safe credentials authentication
    Credentials({
      credentials: {
        message: { },
        signature: { },
        walletOwner: { },
        safeAddress: { },
        authMethod: {}
      },
      authorize: async (credentials) => {
        try {
          console.log('Safe credentials authorize called with:', credentials);

          if (!credentials?.message || !credentials?.signature || !credentials?.walletOwner || !credentials?.safeAddress) {
            console.log('Missing required credentials (message, signature, walletOwner, safeAddress), returning null');
            return null;
          }

          const message = credentials.message as string;
          const signature = credentials.signature as string;
          const walletOwner = credentials.walletOwner as string;
          const safeAddress = credentials.safeAddress as string;

          const result = await authService.authenticateWithCredentials(
            message,
            signature,
            walletOwner,
            safeAddress
          );

          console.log('Authentication result:', result);

          if (result.success && result.user) {
            const userObj = {
              id: result.user.safeAddress,
              email: result.user.email,
              name: result.user.name,
              image: null,
              profileId: result.user.profileId,
              safeAddress: result.user.safeAddress,
              username: result.user.username,
              controllingEOA: result.user.controllingEOA,
              authMethod: credentials?.authMethod
            };
            console.log('Returning user object:', userObj);
            return userObj;
          }

          console.log('Authentication failed, returning null');
          return null;
        } catch (error) {
          console.error('Error in Safe credentials authorize function:', error);
          return null;
        }
      }
    })
  ],
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // For Google OAuth, check if this is a Safe wallet user
        if (account?.provider === 'google' && user.email) {
          const safeUserInfo = await authService.getSafeUserInfo(user.email);

          if (safeUserInfo) {
            console.log("Found Safe wallet user, redirecting to client-side signature flow");

            // Store the Safe info for the client to use
            // The client will need to create a challenge, sign it, and then complete auth
            user.safeAddress = safeUserInfo.safeAddress;
            user.profileId = safeUserInfo.profile._id.toString();
            user.username = safeUserInfo.profile.username;
            user.name = safeUserInfo.profile.name;

            console.log("Google user with Safe - client needs to complete signature flow");
            return true;
          }
        }

        // Regular OAuth flow for non-Safe users
        const existingProfile = await Profile.findOne({ email: user.email })
        // @todo redirect to setup profile name
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
    async jwt({ token, user, trigger, account }) {
      // Track the authentication provider
      if (account) {
        token.authProvider = account.provider;
      }

      // For Safe wallet authentication, user object contains all needed data
      if (user && (user as any).safeAddress) {
        token.profileId = (user as any).profileId
        token.safeAddress = (user as any).safeAddress
        token.username = (user as any).username
        token.controllingEOA = (user as any).controllingEOA
        token.email = user.email

        return token
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
        console.log("current token: ", token)
        session.user.profileId = token.profileId
        session.user.safeAddress = token.safeAddress
        session.user.email = token.email || session.user.email
        session.user.username = token.username
        session.user.controllingEOA = token.controllingEOA
        // Add session type information for client-side storage
        if (token.authProvider == 'google') {
          session.user.sessionType = 'oauth2';
        } else if (
          token.authProvider == 'credentials' &&
          (token.authMethod == 'privatekey' || token.authMethod == 'metamask')
        ) {
          session.user.sessionType = token.authMethod;
        }
      }
      console.log('Session with custom data:', session)
      return session
    }
  }
})

