import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ageLabel,
  batchConfirmation,
  batchTotal,
  daysSince,
  isOld,
  meterLabel,
  meterShortLabel,
  meterLevel,
  OLD_PRESENTATION_DAYS,
  runBatch,
  STORAGE_LIMIT_BYTES,
  usagePercent,
} from "../lib/storage-rules";

const MB = 1024 * 1024;
const now = new Date("2026-10-14T12:00:00Z");
const ago = (days: number, hours = 0) =>
  new Date(now.getTime() - (days * 24 + hours) * 3600 * 1000).toISOString();

test("idade em dias completos desde a criação", () => {
  assert.equal(daysSince(ago(0, 5), now), 0);
  assert.equal(daysSince(ago(1), now), 1);
  assert.equal(daysSince(ago(21, 23), now), 21);
  assert.equal(daysSince(ago(30), now), 30);
  assert.equal(daysSince(null, now), null);
  assert.equal(daysSince("não é data", now), null);
  // Relógio adiantado no banco não vira idade negativa.
  assert.equal(daysSince(new Date(now.getTime() + 3600_000).toISOString(), now), 0);
});

test("selo Antiga só com mais de 21 dias", () => {
  assert.equal(OLD_PRESENTATION_DAYS, 21);
  assert.equal(isOld(21), false);
  assert.equal(isOld(22), true);
  assert.equal(isOld(daysSince(ago(21, 23), now)), false);
  assert.equal(isOld(daysSince(ago(22), now)), true);
  assert.equal(isOld(null), false);
  assert.equal(ageLabel(0), "hoje");
  assert.equal(ageLabel(1), "1 dia");
  assert.equal(ageLabel(30), "30 dias");
});

test("faixas do medidor: neutro até 70%, amarelo acima de 70%, vermelho acima de 90%", () => {
  assert.equal(meterLevel(0), "normal");
  assert.equal(meterLevel(70), "normal");
  assert.equal(meterLevel(70.01), "warning");
  assert.equal(meterLevel(90), "warning");
  assert.equal(meterLevel(90.01), "danger");
  assert.equal(meterLevel(120), "danger");
  assert.equal(usagePercent(STORAGE_LIMIT_BYTES / 2), 50);
});

test("texto do medidor", () => {
  assert.equal(STORAGE_LIMIT_BYTES, 1024 * MB);
  assert.equal(meterLabel(512 * MB), "Armazenamento: 512,0 MB de 1 GB (50%)");
  assert.equal(meterLabel(3 * MB), "Armazenamento: 3,0 MB de 1 GB (<1%)");
  assert.equal(meterLabel(0), "Armazenamento: 0,0 MB de 1 GB (0%)");
  assert.equal(meterShortLabel(16.5 * MB), "16,5 MB de 1 GB");
});

test("soma do lote e texto da confirmação", () => {
  const items = [{ bytes: 10 * MB }, { bytes: 2.5 * MB }, { bytes: 0 }];
  assert.deepEqual(batchTotal(items), { count: 3, bytes: 12.5 * MB });
  assert.deepEqual(batchTotal([]), { count: 0, bytes: 0 });
  assert.equal(
    batchConfirmation(items),
    "Apagar 3 apresentações e 12,5 MB? Os links já enviados deixam de funcionar. Não dá pra desfazer.",
  );
  assert.match(batchConfirmation([{ bytes: MB }]), /^Apagar 1 apresentação e 1,0 MB\?/);
});

test("lote: a falha de uma não para as outras e fica na lista de erros", async () => {
  const removed: string[] = [];
  const result = await runBatch(["a", "b", "c"], async (id) => {
    if (id === "b") throw new Error("o bucket não apagou");
    removed.push(id);
  });
  assert.deepEqual(removed, ["a", "c"]);
  assert.deepEqual(result.deleted, ["a", "c"]);
  assert.deepEqual(result.failed, [{ id: "b", error: "o bucket não apagou" }]);
});
