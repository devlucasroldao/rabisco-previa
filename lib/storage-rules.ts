// Regras do medidor de armazenamento e da limpeza de semanas antigas. Sem
// banco nem navegador aqui: é o que o pnpm test cobre.

import { megabytes } from "./media";

// Limite de arquivos do plano gratuito do Supabase (1 GB, somando o bucket
// inteiro). O banco tem outro limite, de 500 MB, que o medidor não mostra.
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

// A equipe guarda as 3 últimas semanas de cada cliente: passou disso, a
// apresentação ganha o selo "Antiga" e entra na lista de limpeza.
export const OLD_PRESENTATION_DAYS = 21;

// Faixas do medidor, em % do limite.
export const METER_WARNING_PERCENT = 70;
export const METER_DANGER_PERCENT = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// Dias completos desde a criação. Sem data (linha antiga sem created_at), null.
export function daysSince(createdAt: string | null, now: Date): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  return Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
}

// "Mais de 21 dias": no 21º dia ainda não é antiga.
export function isOld(days: number | null): boolean {
  return days !== null && days > OLD_PRESENTATION_DAYS;
}

export function ageLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "hoje";
  return days === 1 ? "1 dia" : `${days} dias`;
}

export function usagePercent(bytes: number): number {
  return (bytes / STORAGE_LIMIT_BYTES) * 100;
}

export type MeterLevel = "normal" | "warning" | "danger";

// Neutro até 70%, amarelo acima de 70% e vermelho acima de 90%.
export function meterLevel(percent: number): MeterLevel {
  if (percent > METER_DANGER_PERCENT) return "danger";
  if (percent > METER_WARNING_PERCENT) return "warning";
  return "normal";
}

export function meterLabel(bytes: number): string {
  const percent = usagePercent(bytes);
  // Abaixo de 1% o arredondamento daria 0%, o que parece vazio.
  const shown = percent > 0 && percent < 1 ? "<1" : String(Math.round(percent));
  return `Armazenamento: ${megabytes(bytes)} de 1 GB (${shown}%)`;
}

export function presentationCount(count: number): string {
  return count === 1 ? "1 apresentação" : `${count} apresentações`;
}

export function batchTotal(items: { bytes: number }[]): { count: number; bytes: number } {
  return {
    count: items.length,
    bytes: items.reduce((sum, item) => sum + item.bytes, 0),
  };
}

export function batchConfirmation(items: { bytes: number }[]): string {
  const { count, bytes } = batchTotal(items);
  return `Apagar ${presentationCount(count)} e ${megabytes(bytes)}? Os links já enviados deixam de funcionar. Não dá pra desfazer.`;
}

export type BatchResult = {
  deleted: string[];
  failed: { id: string; error: string }[];
};

// Apaga um item por vez. A falha de um vira erro na lista e não interrompe
// os demais; quem decide o que "apagar" faz (arquivos antes da linha) é
// remove.
export async function runBatch(
  ids: string[],
  remove: (id: string) => Promise<void>,
): Promise<BatchResult> {
  const result: BatchResult = { deleted: [], failed: [] };
  for (const id of ids) {
    try {
      await remove(id);
      result.deleted.push(id);
    } catch (error) {
      result.failed.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}
