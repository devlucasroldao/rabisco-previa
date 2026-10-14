import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanEnvUrl, cleanEnvValue, SupabaseConfigError } from "../lib/supabase/env";

const NAME = "NEXT_PUBLIC_SUPABASE_URL";
const SECRET = "valor-que-nao-pode-aparecer";

function rejects(fn: () => unknown, expected: RegExp) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof SupabaseConfigError);
    assert.match(error.message, expected);
    assert.ok(error.message.includes(NAME), "a mensagem cita a variável");
    assert.ok(!error.message.includes(SECRET), "a mensagem não mostra o valor");
    return true;
  });
}

test("tira espaços e quebras de linha das pontas", () => {
  assert.equal(cleanEnvValue(NAME, "  abc\n"), "abc");
  assert.equal(cleanEnvUrl(NAME, " https://x.supabase.co\r\n"), "https://x.supabase.co");
});

test("recusa valor vazio ou ausente", () => {
  rejects(() => cleanEnvValue(NAME, undefined), /vazia/);
  rejects(() => cleanEnvValue(NAME, "   "), /vazia/);
});

test("recusa aspas nas pontas", () => {
  rejects(() => cleanEnvValue(NAME, `"${SECRET}"`), /aspas/);
  rejects(() => cleanEnvValue(NAME, `'${SECRET}`), /aspas/);
  rejects(() => cleanEnvValue(NAME, `${SECRET}"`), /aspas/);
});

test("recusa URL sem https:// ou com barra no final", () => {
  rejects(() => cleanEnvUrl(NAME, `http://${SECRET}.supabase.co`), /https:\/\//);
  rejects(() => cleanEnvUrl(NAME, `${SECRET}.supabase.co`), /https:\/\//);
  rejects(() => cleanEnvUrl(NAME, `https://${SECRET}.supabase.co/`), /terminar/);
});
