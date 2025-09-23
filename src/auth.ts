import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/sveltekit/providers/google"
import Apple from "@auth/sveltekit/providers/apple"
import Credentials from "@auth/sveltekit/providers/credentials"
import { env } from "$env/dynamic/private"
import type { DefaultSession } from "@auth/core/types"

import mongoose from 'mongoose'
import Safe from '@safe-global/protocol-kit'
import { Profile } from '$lib/models/Profile';
import { safeAuthService } from '$lib/auth/SafeAuthService';

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      profileId?: string;
      safeAddress?: string;
      username?: string;
      controllingEOA?: string;
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


//TODO: Add apple provider
console.log('Initializing SvelteKitAuth with providers...');
export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  providers: [
    Google({clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET}),
    Apple({clientId: env.AUTH_APPLE_ID, clientSecret: env.AUTH_APPLE_SECRET}),

    // Flow 1: Direct private key login with automatic Safe discovery
    Credentials({
      id: "safe-pk",
      name: "Safe Private Key",
      credentials: {
        privateKey: { label: "Private Key", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('Safe-PK authorize called with private key');

          if (!credentials?.privateKey) {
            console.log('Missing private key, returning null');
            return null;
          }

          // Get Safe addresses controlled by this private key
          console.log('Getting Safe addresses for private key...');
          const safeInfo = await safeAuthService.getSafeAddressesForPrivateKey(credentials.privateKey as string);

          if (!safeInfo.controlledSafes || safeInfo.controlledSafes.length === 0) {
            console.log('No Safe addresses found for private key');
            return null;
          }

          // Use the first Safe address
          const selectedSafeAddress = safeInfo.controlledSafes[0];
          console.log('Auto-selected first Safe:', selectedSafeAddress);

          // Generate challenge and sign automatically
          console.log('Generating challenge...');
          const challenge = safeAuthService.generateChallenge();

          // Create Safe signature using protocol-kit
          console.log('Initializing Safe protocol-kit...');
          const protocolKit = await Safe.init({
            provider: env.RPC_URL,
            signer: credentials.privateKey as string,
            safeAddress: selectedSafeAddress
          });

          console.log('Creating and signing message...');
          const safeMessage = await protocolKit.createMessage(challenge.message);
          const signedSafeMessage = await protocolKit.signMessage(safeMessage);
          const encodedSignature = signedSafeMessage.encodedSignatures();

          console.log('Authenticating with SafeAuthService...');
          const result = await safeAuthService.authenticateWithPrivateKey(
            credentials.privateKey as string,
            selectedSafeAddress,
            encodedSignature,
            challenge.message
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
              controllingEOA: result.user.controllingEOA
            };
            console.log('Returning user object:', userObj);
            return userObj;
          }

          console.log('Authentication failed, returning null');
          return null;
        } catch (error) {
          console.error('Error in Safe-PK authorize function:', error);
          return null;
        }
      }
    })
  ],
  secret: env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // For Google OAuth, check if this is a Safe wallet user
        if (account?.provider === 'google') {
          const existingProfile = await Profile.findOne({
            email: user.email,
            $and: [
              { safeAddress: { $exists: true, $ne: null } },
              { safeAddress: { $ne: '0x' } },
              { privateKey: { $exists: true, $ne: null } },
              { privateKey: { $ne: '' } }
            ]
          });

          if (existingProfile) {
            // This is a Safe wallet user - prepare data for Safe verification
            console.log("Found Safe wallet user, preparing Safe verification...");

            const challenge = safeAuthService.generateChallenge();
            const privateKey = existingProfile.privateKey;
            const safeAddress = existingProfile.safeAddress;
            // Implement Safe signature using @safe-global/protocol-kit
            const protocolKit = await Safe.init({
              provider: env.RPC_URL,
              signer: privateKey,
              safeAddress: safeAddress
            })

            const safeMessage = await protocolKit.createMessage(challenge.message)
            const signedSafeMessage = await protocolKit.signMessage(safeMessage)
            const encodedSignature = signedSafeMessage.encodedSignatures();

            // Verify the signature
            const verificationResult = await safeAuthService.authenticateWithGoogle(
              user.email!,
              encodedSignature,
              challenge.message
            );

            if (!verificationResult.success) {
              console.error("Safe verification failed:", verificationResult.error);
              return false;
            }

            console.log("Safe verification successful for Google user");
            return true;
          }
        }

        // Regular OAuth flow for non-Safe users
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

      // For Safe wallet authentication, user object contains all needed data
      if (user && (user as any).safeAddress) {
        token.profileId = (user as any).profileId
        token.safeAddress = (user as any).safeAddress
        token.username = (user as any).username
        token.controllingEOA = (user as any).controllingEOA
        token.email = user.email
        console.log("JWT updated with Safe wallet data:", {
          safeAddress: token.safeAddress,
          username: token.username,
          controllingEOA: token.controllingEOA
        })
        return token
      }

      // Always refresh profile data from database to get latest username for OAuth
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
        session.user.controllingEOA = token.controllingEOA
      }
      console.log('Session with custom data:', session)
      return session
    }
  }
})
