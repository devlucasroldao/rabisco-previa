import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/admin/login";

// Renova a sessão do painel: Server Component não grava cookie, então o token
// renovado precisa sair daqui. O redirecionamento é só conforto (evita piscar
// a moldura do painel pra quem não entrou); quem autoriza é o requireStaff().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isLogin = request.nextUrl.pathname === LOGIN_PATH;

  // Ambiente mal configurado: ninguém entra, mas a tela de login continua
  // abrindo. A mensagem diz qual variável tem problema, sem o valor.
  let env: ReturnType<typeof getSupabasePublicEnv>;
  try {
    env = getSupabasePublicEnv();
  } catch (error) {
    console.error(`[proxy] ${error instanceof Error ? error.message : "configuração inválida"}`);
    return isLogin ? response : NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  const supabase = createServerClient(env.url, env.anonKey, {
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
