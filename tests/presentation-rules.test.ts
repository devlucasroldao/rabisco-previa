// Testes de unidade, sem rede: pnpm test

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLinkActive,
  moveItem,
  newPasswordProblem,
  PASSWORD_MIN_LENGTH,
  reorderProblem,
} from "../lib/presentation-rules";

const current = ["a", "b", "c"];

test("reorder aceita os mesmos posts em outra ordem", () => {
  assert.equal(reorderProblem(current, ["c", "a", "b"]), null);
  assert.equal(reorderProblem(current, ["a", "b", "c"]), null);
});

test("reorder recusa lista com post faltando", () => {
  assert.equal(reorderProblem(current, ["a", "b"]), "faltando");
  assert.equal(reorderProblem(current, []), "faltando");
});

test("reorder recusa lista com post sobrando", () => {
  assert.equal(reorderProblem(current, ["a", "b", "c", "d"]), "sobrando");
  // Mesmo tamanho, mas com um de outra apresentação no lugar de um daqui.
  assert.equal(reorderProblem(current, ["a", "b", "x"]), "faltando");
});

test("reorder recusa lista com post duplicado", () => {
  assert.equal(reorderProblem(current, ["a", "a", "b", "c"]), "duplicado");
  assert.equal(reorderProblem(current, ["a", "a", "b"]), "duplicado");
});

test("moveItem leva o item pra nova posição sem mexer na original", () => {
  const list = ["a", "b", "c", "d"];
  assert.deepEqual(moveItem(list, 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(list, 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(list, 1, 1), list);
  assert.deepEqual(moveItem(list, 0, 9), list);
  assert.deepEqual(list, ["a", "b", "c", "d"]);
});

test("link desativado não abre; ativo ou sem a coluna abre", () => {
  assert.equal(isLinkActive({ active: false }), false);
  assert.equal(isLinkActive({ active: true }), true);
  assert.equal(isLinkActive({ active: null }), true);
  assert.equal(isLinkActive({}), true);
});

const good = "uma-senha-longa-ok";

test("senha nova válida passa", () => {
  assert.equal(newPasswordProblem({ current: "antiga", next: good, confirmation: good }), null);
});

test("senha nova curta é recusada", () => {
  const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
  assert.match(
    newPasswordProblem({ current: "antiga", next: short, confirmation: short }) ?? "",
    /pelo menos 12 caracteres/,
  );
  const exact = "a".repeat(PASSWORD_MIN_LENGTH);
  assert.equal(newPasswordProblem({ current: "antiga", next: exact, confirmation: exact }), null);
});

test("senha nova acima de 72 bytes é recusada", () => {
  const long = "a".repeat(73);
  assert.match(newPasswordProblem({ current: "x", next: long, confirmation: long }) ?? "", /72/);
  // 37 letras acentuadas = 74 bytes em UTF-8.
  const accented = "á".repeat(37);
  assert.match(
    newPasswordProblem({ current: "x", next: accented, confirmation: accented }) ?? "",
    /72/,
  );
});

test("confirmação diferente, senha igual à atual e atual vazia são recusadas", () => {
  assert.match(
    newPasswordProblem({ current: "antiga", next: good, confirmation: `${good}!` }) ?? "",
    /confirmação/,
  );
  assert.match(
    newPasswordProblem({ current: good, next: good, confirmation: good }) ?? "",
    /diferente da atual/,
  );
  assert.match(
    newPasswordProblem({ current: "", next: good, confirmation: good }) ?? "",
    /senha atual/,
  );
});

test("senha nova com espaço nas pontas é recusada", () => {
  const spaced = ` ${good}`;
  assert.match(
    newPasswordProblem({ current: "antiga", next: spaced, confirmation: spaced }) ?? "",
    /espaço/,
  );
});
