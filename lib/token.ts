import { nanoid } from "nanoid";

// Token do link do cliente. O alfabeto e o tamanho precisam passar no
// TOKEN_PATTERN de lib/data.ts.
export function newToken(): string {
  return nanoid(12);
}
