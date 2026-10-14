// Regras de gestão da apresentação, sem rede: reordenação, link ativo e troca
// de senha. Testadas em tests/presentation-rules.test.ts.

// A mesma conferência que a função SQL reorder_posts faz, pra o painel
// responder sem ir ao banco quando a lista já chega errada. O banco confere
// de novo de forma atômica.
export function reorderProblem(
  currentIds: readonly string[],
  ids: readonly string[],
): "duplicado" | "faltando" | "sobrando" | null {
  if (new Set(ids).size !== ids.length) return "duplicado";
  const current = new Set(currentIds);
  const received = new Set(ids);
  if (currentIds.some((id) => !received.has(id))) return "faltando";
  if (ids.some((id) => !current.has(id))) return "sobrando";
  return null;
}

// Move um item da lista de from pra to (índices), sem mexer na original.
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// A tela do cliente só abre link ativo. Linha sem a coluna (antes da
// migration) conta como ativa.
export function isLinkActive(row: { active?: boolean | null }): boolean {
  return row.active !== false;
}

export const PASSWORD_MIN_LENGTH = 12;
// O Supabase Auth (bcrypt) só considera os primeiros 72 bytes.
export const PASSWORD_MAX_BYTES = 72;

export function newPasswordProblem(input: {
  current: string;
  next: string;
  confirmation: string;
}): string | null {
  if (!input.current) return "Informe a senha atual.";
  if (input.next.length < PASSWORD_MIN_LENGTH) {
    return `A nova senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (new TextEncoder().encode(input.next).length > PASSWORD_MAX_BYTES) {
    return `A nova senha pode ter no máximo ${PASSWORD_MAX_BYTES} caracteres (sem acento).`;
  }
  if (input.next.trim() !== input.next) {
    return "A nova senha não pode começar nem terminar com espaço.";
  }
  if (input.next !== input.confirmation) return "A confirmação não é igual à nova senha.";
  if (input.next === input.current) return "A nova senha precisa ser diferente da atual.";
  return null;
}
