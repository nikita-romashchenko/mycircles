import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { signIn } from "../../auth"
import { superValidate } from 'sveltekit-superforms';
import { signInSchema } from '$lib/validation/schemas';
import { zod } from 'sveltekit-superforms/adapters';





export const load: PageServerLoad = async ({ locals }) => {
  // Initialize form with email
  const form = await superValidate({}, zod(signInSchema));

  return {
    form
  };
};

export const actions = { default: signIn } satisfies Actions


