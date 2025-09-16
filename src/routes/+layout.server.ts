import type { LayoutServerLoad } from "./$types"
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  // Check if user needs registration (but skip auth-related routes)
  if (session?.user && !session.user.username) {
    const pathname = event.url.pathname;

    if (!pathname.startsWith('/registration') &&
        !pathname.startsWith('/signout') &&
        !pathname.startsWith('/api/auth')) {
      throw redirect(302, `/registration`);
    }
  }

  return {
    session,
  }
}
