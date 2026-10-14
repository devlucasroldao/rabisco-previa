// Testes de unidade, sem rede: pnpm test

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authErrorFields,
  CONFIG_OR_CONNECTION_MESSAGE,
  currentPasswordErrorMessage,
  INVALID_CREDENTIALS_MESSAGE,
  loginErrorMessage,
  passwordUpdateErrorMessage,
  WRONG_CURRENT_PASSWORD_MESSAGE,
} from "../lib/auth-error";
import { SupabaseConfigError } from "../lib/supabase/env";

function authError(fields: { status?: number; code?: string; name?: string }) {
  return Object.assign(new Error("mensagem crua do Supabase"), fields);
}

test("invalid_credentials vira e-mail ou senha incorretos", () => {
  const error = authError({ status: 400, code: "invalid_credentials", name: "AuthApiError" });
  assert.equal(loginErrorMessage(error), INVALID_CREDENTIALS_MESSAGE);
});

test("qualquer outro erro vira erro de configuração ou de conexão", () => {
  const others: unknown[] = [
    authError({ status: 401, name: "AuthApiError" }),
    authError({ status: 403, code: "bad_jwt", name: "AuthApiError" }),
    authError({ status: 400, code: "email_not_confirmed", name: "AuthApiError" }),
    authError({ status: 0, name: "AuthRetryableFetchError" }),
    authError({ status: 500, code: "unexpected_failure", name: "AuthApiError" }),
    new SupabaseConfigError("NEXT_PUBLIC_SUPABASE_ANON_KEY está vazia ou não foi definida."),
    new TypeError("fetch failed"),
    "erro solto",
    null,
  ];
  for (const error of others) {
    assert.equal(loginErrorMessage(error), CONFIG_OR_CONNECTION_MESSAGE);
  }
});

test("o log leva só status, code e name", () => {
  const error = authError({ status: 401, code: "no_authorization", name: "AuthApiError" });
  assert.deepEqual(authErrorFields(error), {
    status: 401,
    code: "no_authorization",
    name: "AuthApiError",
  });
  assert.deepEqual(authErrorFields("erro solto"), { status: null, code: null, name: null });
});

test("troca de senha: senha atual errada e erros do updateUser em português", () => {
  assert.equal(
    currentPasswordErrorMessage(authError({ status: 400, code: "invalid_credentials" })),
    WRONG_CURRENT_PASSWORD_MESSAGE,
  );
  assert.equal(
    currentPasswordErrorMessage(authError({ status: 0, name: "AuthRetryableFetchError" })),
    CONFIG_OR_CONNECTION_MESSAGE,
  );
  assert.match(passwordUpdateErrorMessage(authError({ code: "same_password" })), /diferente/);
  assert.match(passwordUpdateErrorMessage(authError({ code: "weak_password" })), /fraca/);
  assert.equal(
    passwordUpdateErrorMessage(authError({ status: 500, code: "unexpected_failure" })),
    CONFIG_OR_CONNECTION_MESSAGE,
  );
});
