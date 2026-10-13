// Os scripts rodam fora do Next, então carregam o .env.local por conta própria.
export function loadEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sem .env.local: vale o que já estiver no ambiente.
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Falta ${name}. Copie .env.example para .env.local e preencha com os dados do Supabase.`,
    );
    process.exit(1);
  }
  return value;
}
