import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/admin/login";

// Renova a sessão do painel: Server Component não grava cookie, então o token
// renovado precisa sair daqui. O redirecionamento é só conforto (evita piscar
// a moldura do painel pra quem não entrou); quem autoriza é o requireStaff().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isLogin = request.nextUrl.pathname === LOGIN_PATH;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return isLogin ? response : NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  if (signedIn !== isLogin) return response;

  const redirect = NextResponse.redirect(
    new URL(signedIn ? "/admin" : LOGIN_PATH, request.url),
  );
  // Leva junto os cookies que a renovação da sessão tiver gravado.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: "/admin/:path*",
};
