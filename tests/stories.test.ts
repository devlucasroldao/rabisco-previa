import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addSeen,
  allSeen,
  avatarLabel,
  contentCounter,
  firstOfDay,
  formatStoryChip,
  formatStoryDay,
  groupByDay,
  isStoryDay,
  nextStory,
  numberStories,
  parseSeen,
  previousStory,
  seenStorageKey,
  showsHint,
  skipsGrid,
  storyLabel,
  storyPlace,
} from "../lib/stories";

test("dia sem erro de fuso, mesmo com o processo num fuso a oeste de Greenwich", () => {
  const previous = process.env.TZ;
  // O Intl lê o TZ do processo: o formato tem que sair igual em qualquer um.
  for (const zone of ["America/Sao_Paulo", "America/Los_Angeles", "Pacific/Kiritimati", "UTC"]) {
    process.env.TZ = zone;
    assert.equal(formatStoryDay("2026-10-12"), "Segunda, 12/10");
    assert.equal(formatStoryDay("2026-10-14"), "Quarta, 14/10");
    assert.equal(formatStoryDay("2026-10-17"), "Sábado, 17/10");
    assert.equal(formatStoryDay("2026-10-18"), "Domingo, 18/10");
    assert.equal(formatStoryDay("2027-01-01"), "Sexta, 01/01");
    assert.equal(formatStoryChip("2026-10-12"), "Seg 12");
    assert.equal(formatStoryChip("2026-10-14"), "Qua 14");
    assert.equal(formatStoryChip("2026-11-01"), "Dom 1");
  }
  process.env.TZ = previous;
});

test("só aceita dia no formato YYYY-MM-DD que existe", () => {
  assert.equal(isStoryDay("2026-10-12"), true);
  assert.equal(isStoryDay("2028-02-29"), true);
  assert.equal(isStoryDay("2026-02-30"), false);
  assert.equal(isStoryDay("12/10/2026"), false);
  assert.equal(isStoryDay(""), false);
});

const rows = [
  { id: "d", day: "2026-10-14", position: 1, url: "d" },
  { id: "b", day: "2026-10-12", position: 5, url: "b" },
  { id: "a", day: "2026-10-12", position: 2, url: "a" },
  { id: "c", day: "2026-10-13", position: 9, url: "c" },
];

test("numeração global de 1 a T, por dia e depois por position", () => {
  const stories = numberStories(rows);
  assert.deepEqual(
    stories.map((story) => [story.id, story.number]),
    [["a", 1], ["b", 2], ["c", 3], ["d", 4]],
  );
  assert.deepEqual(
    groupByDay(stories).map((group) => [group.day, group.stories.length]),
    [["2026-10-12", 2], ["2026-10-13", 1], ["2026-10-14", 1]],
  );
  assert.equal(storyLabel(stories, 2), "Segunda, 12/10 · Story 2 de 4");
});

test("avanço entre dias: do último de um dia pro primeiro do seguinte, e fecha no fim", () => {
  const stories = numberStories(rows);
  assert.equal(nextStory(4, 2), 3);
  assert.equal(stories[2].day, "2026-10-13");
  assert.equal(nextStory(4, 4), null);
  assert.equal(previousStory(1), 1);
  assert.equal(previousStory(3), 2);
  assert.equal(firstOfDay(stories, "2026-10-13"), 3);
  assert.equal(firstOfDay(stories, "2026-10-14"), 4);
  assert.deepEqual(
    (({ day, indexInDay, dayCount }) => ({ day, indexInDay, dayCount }))(storyPlace(stories, 2)),
    { day: "2026-10-12", indexInDay: 1, dayCount: 2 },
  );
});

test("pular o grid só com 1 post e nenhum story", () => {
  assert.equal(skipsGrid(1, 0), true);
  assert.equal(skipsGrid(1, 3), false);
  assert.equal(skipsGrid(0, 3), false);
  assert.equal(skipsGrid(3, 0), false);
  assert.equal(contentCounter(3, 0), "3 conteúdos");
  assert.equal(contentCounter(1, 1), "1 conteúdo · 1 story");
  assert.equal(contentCounter(0, 3), "0 conteúdos · 3 stories");
});

test("balão: uma vez por aparelho, nunca com tudo visto, sempre se o armazenamento falhar", () => {
  const base = { storyCount: 3, everythingSeen: false, dismissed: false, closedNow: false };
  assert.equal(showsHint(base), true);
  assert.equal(showsHint({ ...base, dismissed: true }), false);
  assert.equal(showsHint({ ...base, closedNow: true }), false);
  assert.equal(showsHint({ ...base, everythingSeen: true }), false);
  assert.equal(showsHint({ ...base, storyCount: 0 }), false);
  // localStorage indisponível: aparece, até a pessoa fechar nesta visita.
  assert.equal(showsHint({ ...base, dismissed: null }), true);
  assert.equal(showsHint({ ...base, dismissed: null, closedNow: true }), false);
});

test("todos vistos: conjunto de números, valor estragado e chave por token", () => {
  let raw: string | null = null;
  assert.equal(allSeen(parseSeen(raw), 3), false);
  for (const number of [2, 1, 2]) raw = addSeen(raw, number);
  assert.equal(raw, "[1,2]");
  assert.equal(allSeen(parseSeen(raw), 3), false);
  raw = addSeen(raw, 3);
  assert.equal(allSeen(parseSeen(raw), 3), true);
  // Story novo depois de ver tudo: volta a ter o que ver.
  assert.equal(allSeen(parseSeen(raw), 4), false);
  assert.equal(allSeen(new Set(), 0), false);

  // Valor estragado ou de outro formato vale como nada visto.
  for (const bad of ["{", '"oi"', "[0,-1,1.5,\"2\"]", "null"]) {
    assert.equal(parseSeen(bad).size, 0, bad);
  }

  // Cada apresentação tem token novo, então a chave é outra e começa vazia.
  assert.notEqual(seenStorageKey("semanaA123"), seenStorageKey("semanaB456"));
  assert.equal(seenStorageKey("abc"), "rabisco-previa:stories-visto:abc");

  assert.equal(avatarLabel(3, false), "Ver stories da semana (3)");
  assert.equal(avatarLabel(3, true), "Ver stories da semana (3, todos vistos)");
});
