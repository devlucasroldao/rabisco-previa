// Traduz o erro do login pra tela e pro log do servidor. Fica fora do
// actions.ts porque arquivo "use server" só exporta função assíncrona.

export const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha incorretos.";
export const CONFIG_OR_CONNECTION_MESSAGE =
  "Erro de configuração ou de conexão. Tente de novo e, se continuar, avise o Lucas.";

type AuthErrorFields = {
  status: number | null;
  code: string | null;
  name: string | null;
};

function field(error: unknown, key: string): unknown {
  return typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

// Só o que é seguro registrar: a mensagem do erro fica de fora porque pode
// trazer dados da requisição.
export function authErrorFields(error: unknown): AuthErrorFields {
  const status = field(error, "status");
  const code = field(error, "code");
  const name = field(error, "name");
  return {
    status: typeof status === "number" ? status : null,
    code: typeof code === "string" ? code : null,
    name: typeof name === "string" ? name : null,
  };
}

// Só o invalid_credentials é culpa de quem digitou. Chave inválida, 401/403,
// falha de rede e variável ausente caem na mensagem de configuração.
export function loginErrorMessage(error: unknown): string {
  return authErrorFields(error).code === "invalid_credentials"
    ? INVALID_CREDENTIALS_MESSAGE
    : CONFIG_OR_CONNECTION_MESSAGE;
}
