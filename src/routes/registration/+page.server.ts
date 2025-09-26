import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';
import { Profile } from '$lib/models/Profile';
import { registrationSchema } from '$lib/validation/schemas';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { ethers } from 'ethers'
import Safe from '@safe-global/protocol-kit'

import { Sdk } from '@circles-sdk/sdk';
import { type TransactionRequest } from '@circles-sdk/adapter';
import { SafeSdkPrivateKeyContractRunner } from "@circles-sdk/adapter-safe";

// @todo I've no idea why we need it but circles sdk doesn;t work without it
import WebSocket from 'ws';
if (!global.WebSocket) {
  (global as any).WebSocket = WebSocket;
}

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}


export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  const email = session?.user?.email;

  if (!email) {
    throw redirect(302, '/signin');
  }

  // Check if user already has a profile with username
  const existingProfile = await Profile.findOne({ email });
  if (existingProfile && existingProfile.username) {
    throw redirect(302, '/');
  }

  // Initialize form with email
  const form = await superValidate({ email }, zod(registrationSchema));

  return {
    form
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const session = await locals.auth();
    const form = await superValidate(request, zod(registrationSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { username, email } = form.data;

    try {
      console.log('Registration attempt:', { email, username });

      // Check if username is already taken
      // const existingUser = await Profile.findOne({ username });
      // if (existingUser) {
      //   return fail(400, { message: 'Username is already taken' });
      // }

      // Check if user already has a profile
      const existingProfile = await Profile.findOne({ email });

      // -------- REGISTER CIRCLES USER --------
      let safeAddress = existingProfile?.safeAddress;
      let privateKey = existingProfile?.privateKey;
      // check if there is no safe already created for this user
      if (!safeAddress || safeAddress === "0x") {

        // Generate a new private key for the user
        const newWallet = ethers.Wallet.createRandom();
        privateKey = newWallet.privateKey;
        const walletAddress = newWallet.address;
        console.log("Generated new wallet with private key:", privateKey, walletAddress);
        // Use the global owner private key for inviter
        try {
          // @todo add type safety
          // @todo take it from the list of controlled safes
          const inviterAddress = env.GLOBAL_OWNER;

          const adapterInviter = new SafeSdkPrivateKeyContractRunner(env.GLOBAL_OWNER_PRIVATE_KEY, env.RPC_URL);
          await adapterInviter.init(inviterAddress as `0x${string}`);
          // @ts-ignore
          const sdkInviter = new Sdk (adapterInviter); 
          const inviterAvatar = await sdkInviter.getAvatar(inviterAddress as `0x${string}`);

          // Create a batch which from the inviter account
          console.log("Initialize batch")
          // @ts-ignore
          const batch = adapterInviter.sendBatchTransaction();

          // 1. Inviter transfers 0.01 xDai to the safe owner wallet
          const transferTx: TransactionRequest = {
            to: walletAddress as `0x${string}`,
            data: "0x",
            value: ethers.parseEther("0.01")
          };
          batch.addTransaction(transferTx);

          // 2. Deploy a Safe wallet with the new wallet as the owner
          const safeClient = await Safe.init({
            provider: env.RPC_URL,
            signer: privateKey,
            predictedSafe: {
              safeAccountConfig: {
                owners: [walletAddress],
                threshold: 1
              }
            }
          });
          const safeAddress = await safeClient.getAddress()
          const deploymentTransaction = await safeClient.createSafeDeploymentTransaction()

          const deploySafeTx: TransactionRequest = {
            to: deploymentTransaction.to as `0x${string}`,
            data: deploymentTransaction.data as `0x${string}`,
            value: BigInt(deploymentTransaction.value)
          };
          batch.addTransaction(deploySafeTx);

          // 3. Inviter 'trusts/invites' the new Safe account
          // @ts-ignore
          const inviteData = sdkInviter.v2Hub.interface.encodeFunctionData('trust', [safeAddress, BigInt('79228162514264337593543950335')]);
          const registerHumanTx: TransactionRequest = {
            to: sdkInviter.circlesConfig.v2HubAddress!,
            data: inviteData,
            value: 0n
          };
          batch.addTransaction(registerHumanTx);
          const batchTx = await batch.run();
          //@ts-ignore
          await batchTx?.wait();
          console.log("Batch Run is successfull")
          console.log("SafeAddress:", safeAddress);

          existingProfile.safeAddress = safeAddress;
          existingProfile.privateKey = privateKey;
          // @todo check if there is a Circles account already
          const adapterNewUser = new SafeSdkPrivateKeyContractRunner(existingProfile.privateKey, env.RPC_URL);
          await adapterNewUser.init(existingProfile.safeAddress as `0x${string}`);
          // @ts-ignore
          const sdkNewUser = new Sdk (adapterNewUser);
          console.log("New user avatar initialised");
          // User accepts the intivation
          await sdkNewUser.acceptInvitation(inviterAddress as `0x${string}`, {
            name: username
          });
          // Inviter untrusts the User
          // @dev Untrust is async
          inviterAvatar.untrust(existingProfile.safeAddress as `0x${string}`);
          console.log("Invite retracted");
        } catch (error) {
          console.error("Error creating Circles account:", error);
        }

      }
      // -------- END OF THE CIRCLES REGISTR LOGIC --------
      if (existingProfile) {
        // Update existing profile with username
        console.log('Updating existing profile with username:', username);
        existingProfile.username = username;
        if (!existingProfile.name && session?.user?.name) {
          existingProfile.name = session.user.name;
        }
        if (privateKey && !existingProfile.privateKey) {
          existingProfile.privateKey = privateKey;
        }
        const savedProfile = await existingProfile.save();
        console.log('Profile updated:', savedProfile);
      }
      // @todo Max: I think this condition is never triggered
      /* else {
        // Create new profile
        console.log('Creating new profile with:', { email, username, name: session?.user?.name || '' });
        const newProfile = new Profile({
          email,
          username,
          name: session?.user?.name || '',
          privateKey: privateKey || ''
        });
        const savedProfile = await newProfile.save();
        console.log('New profile created:', savedProfile);
      }*/

      return { form };
    } catch (error) {
      console.error('Error creating profile:', error);
      return fail(500, { message: 'Failed to create profile: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  }
};