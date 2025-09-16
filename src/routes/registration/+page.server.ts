import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';
import { Profile } from '$lib/models/Profile';
import { registrationSchema } from '$lib/validation/schemas';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

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
      console.log('Existing profile:', existingProfile);

      if (existingProfile) {
        // Update existing profile with username
        console.log('Updating existing profile with username:', username);
        existingProfile.username = username;
        if (!existingProfile.name && session?.user?.name) {
          existingProfile.name = session.user.name;
        }
        const savedProfile = await existingProfile.save();
        console.log('Profile updated:', savedProfile);
      } else {
        // Create new profile
        console.log('Creating new profile with:', { email, username, name: session?.user?.name || '' });
        const newProfile = new Profile({
          email,
          username,
          name: session?.user?.name || ''
        });
        const savedProfile = await newProfile.save();
        console.log('New profile created:', savedProfile);
      }

      return { form };
    } catch (error) {
      console.error('Error creating profile:', error);
      return fail(500, { message: 'Failed to create profile: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  }
};