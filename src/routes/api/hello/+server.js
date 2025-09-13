import { json, error } from '@sveltejs/kit';

export async function GET({ locals }) {
  const session = await locals.auth();
  
  if (!session?.user) {
    throw error(401, 'Not authenticated');
  }
  
  return json({ 
    message: `Hello ${session.user.name || session.user.email}!`,
    user: session.user
  });
}