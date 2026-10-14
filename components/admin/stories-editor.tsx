"use client";

import { ArrowDown, ArrowUp, CalendarDays, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteStory, moveStory, saveStories, setStoryDay } from "@/app/admin/actions";
import type { AdminStory } from "@/lib/admin-data";
import { resizePostImage } from "@/lib/image";
import { IMAGE_INPUT_TYPES, IMAGE_OUTPUT_TYPE, megabytes, presentationFolder } from "@/lib/media";
import {
  formatStoryDay,
  groupByDay,
  STORY_INPUT_MAX_BYTES,
  STORY_MAX_PER_PRESENTATION,
} from "@/lib/stories";
import { removeFromBucket, uploadToBucket } from "@/lib/upload";
import { ActionMenu } from "./primitives/action-menu";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import { Dialog } from "./primitives/dialog";
import { Dropzone } from "./primitives/dropzone";
import { EmptyState } from "./primitives/empty-state";
import { ProgressBar } from "./progress-bar";
import { buttonClass, errorClass, inputClass, labelClass, primaryButtonClass } from "./ui";

const DELETE_WARNING =
  "Os números dos stories seguintes vão mudar. Se o link já foi enviado ao cliente, avise no WhatsApp.";

type NumberedStory = AdminStory & { number: number };

export function StoriesEditor({
  presentationId,
  stories,
}: {
  presentationId: string;
  stories: AdminStory[];
}) {
  // A lista já vem em ordem de dia e de position; o número sai dela.
  const numbered = stories.map((story, index) => ({ ...story, number: index + 1 }));
  // O dia é só cabeçalho: a troca de dia é por story, no menu "⋯".
  const days = groupByDay(numbered);

  return (
    <div className="space-y-6">
      {days.length === 0 ? (
        <EmptyState title="Nenhum story ainda">
          Eles aparecem pro cliente ao tocar na foto do perfil.
        </EmptyState>
      ) : (
        days.map((group) => (
          <section key={group.day} aria-label={formatStoryDay(group.day)}>
            <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold">
              <CalendarDays size={15} aria-hidden="true" className="text-fg-muted" />
              {formatStoryDay(group.day)}
              <span className="font-normal text-fg-muted">
                · {group.stories.length} {group.stories.length === 1 ? "story" : "stories"}
              </span>
            </h3>
            <ol className="divide-y divide-border border-y border-border">
              {group.stories.map((story, index) => (
                <li key={story.id} className="admin-list-in">
                  <StoryRow
                    story={story}
                    first={index === 0}
                    last={index === group.stories.length - 1}
                  />
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
      <AddStories presentationId={presentationId} existing={stories.length} />
    </div>
  );
}

function StoryRow({ story, first, last }: { story: NumberedStory; first: boolean; last: boolean }) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [day, setDay] = useState(story.day);
  const [error, setError] = useState<string | null>(null);
  const { number } = story;

  function run(action: () => Promise<{ error?: string }>, done?: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (done) {
        toast.success(done);
      }
    });
  }

  return (
    <div
      aria-busy={deleting || undefined}
      className={`flex items-center gap-3 py-2 transition-opacity duration-(--dur-base) ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <span className="w-5 text-center text-[14px] font-semibold tabular-nums">{number}</span>
      <span className="block aspect-[9/16] h-16 shrink-0 overflow-hidden rounded-md border border-border bg-bg-subtle">
        {story.url && (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada, que expira
          <img src={story.url} alt={`Story ${number}`} className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-[13px] text-fg-muted">
        {deleting ? "Excluindo…" : pending ? "Salvando…" : `Story ${number}`}
        {error && (
          <span role="alert" className={`block ${errorClass}`}>
            {error}
          </span>
        )}
      </span>
      <ActionMenu
        label={`Ações do story ${number}`}
        disabled={pending}
        actions={[
          {
            label: "Subir",
            icon: <ArrowUp size={16} />,
            onSelect: () => run(() => moveStory(story.id, -1)),
            disabled: first,
          },
          {
            label: "Descer",
            icon: <ArrowDown size={16} />,
            onSelect: () => run(() => moveStory(story.id, 1)),
            disabled: last,
          },
          {
            label: "Mover para outro dia",
            icon: <CalendarDays size={16} />,
            onSelect: () => {
              setDay(story.day);
              setMoving(true);
            },
          },
          {
            label: "Excluir",
            icon: <Trash2 size={16} />,
            onSelect: () => setConfirming(true),
            danger: true,
          },
        ]}
      />

      <Dialog open={moving} onClose={() => setMoving(false)} title={`Mover o story ${number}`}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setMoving(false);
            if (day && day !== story.day) run(() => setStoryDay(story.id, day), `Story movido pra ${formatStoryDay(day)}.`);
          }}
          className="space-y-4"
        >
          <label className={labelClass}>
            Dia do story {number}
            <input
              type="date"
              value={day}
              required
              onChange={(event) => setDay(event.target.value)}
              className={inputClass}
            />
            <span className="mt-1 block text-[12px] font-normal text-fg-muted">
              Ele entra no fim do dia escolhido.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMoving(false)} className={buttonClass("secondary")}>
              Cancelar
            </button>
            <button type="submit" className={buttonClass("primary")}>
              Mover
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Excluir o story ${number}?`}
        description={DELETE_WARNING}
        confirmLabel="Excluir"
        pendingLabel="Excluindo…"
        onConfirm={() => {
          setConfirming(false);
          setDeleting(true);
          startTransition(async () => {
            const result = await deleteStory(story.id);
            if (result.error) {
              setDeleting(false);
              setError(result.error);
              toast.error(`O story ${number} não foi excluído.`, { description: result.error });
            } else {
              toast.success(`Story ${number} excluído.`);
            }
          });
        }}
      />
    </div>
  );
}

type Picked = { key: string; file: File; previewUrl: string; progress: number | null };

function AddStories({ presentationId, existing }: { presentationId: string; existing: number }) {
  const [day, setDay] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const remaining = STORY_MAX_PER_PRESENTATION - existing;

  function choose(files: File[]) {
    // A ordem da seleção é a ordem dos stories no dia.
    setError(null);
    const invalid = files.find((file) => !IMAGE_INPUT_TYPES.includes(file.type));
    if (invalid) {
      setError(`"${invalid.name}" precisa ser JPG, PNG ou WebP.`);
      return;
    }
    const tooBig = files.find((file) => file.size > STORY_INPUT_MAX_BYTES);
    if (tooBig) {
      setError(
        `"${tooBig.name}" tem ${megabytes(tooBig.size)} e o limite é ${megabytes(STORY_INPUT_MAX_BYTES)}.`,
      );
      return;
    }
    if (files.length > remaining) {
      setError(`Uma apresentação tem até ${STORY_MAX_PER_PRESENTATION} stories. Cabem mais ${remaining}.`);
      return;
    }
    setPicked(
      files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: null,
      })),
    );
  }

  function setProgress(key: string, progress: number | null) {
    setPicked((current) => current.map((item) => (item.key === key ? { ...item, progress } : item)));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!day) {
      setError("Escolha o dia dos stories.");
      return;
    }
    if (picked.length === 0) {
      setError("Escolha ao menos uma imagem.");
      return;
    }
    setError(null);
    setBusy(true);

    // O que subiu nesta tentativa, pra desfazer se algo falhar.
    const uploaded: string[] = [];
    try {
      for (const item of picked) {
        const body = await resizePostImage(item.file);
        const path = `${presentationFolder(presentationId)}/${crypto.randomUUID()}.jpg`;
        setProgress(item.key, 0);
        await uploadToBucket(path, body, IMAGE_OUTPUT_TYPE, {
          onProgress: (fraction) => setProgress(item.key, fraction),
        });
        uploaded.push(path);
      }

      // As linhas só são gravadas depois que todos os envios terminaram.
      const result = await saveStories({ presentationId, day, paths: uploaded });
      if (result.error) throw new Error(result.error);
      toast.success(
        `${picked.length === 1 ? "1 story adicionado" : `${picked.length} stories adicionados`} em ${formatStoryDay(day)}.`,
      );
      setPicked([]);
    } catch (cause) {
      await removeFromBucket(uploaded).catch(() => {});
      setPicked((current) => current.map((item) => ({ ...item, progress: null })));
      setError(cause instanceof Error ? cause.message : "Não deu pra salvar os stories.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Adicionar stories"
      className="space-y-4 rounded-lg border border-border p-4 sm:p-5"
    >
      <h3 className="text-[15px] font-semibold">Adicionar stories</h3>
      <label className={`${labelClass} max-w-[240px]`}>
        Dia
        <input
          type="date"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          required
          disabled={busy}
          className={inputClass}
        />
      </label>
      {remaining > 0 ? (
        <Dropzone
          label="Artes dos stories"
          hint={`JPG, PNG ou WebP, 9:16, até ${megabytes(STORY_INPUT_MAX_BYTES)} cada. Cabem mais ${remaining}.`}
          accept={IMAGE_INPUT_TYPES.join(",")}
          multiple
          onFiles={choose}
          disabled={busy}
        />
      ) : (
        <p className="text-[13px] text-fg-muted">
          Esta apresentação já tem {STORY_MAX_PER_PRESENTATION} stories, o máximo.
        </p>
      )}
      {picked.length > 0 && (
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
          {picked.map((item, index) => (
            <li key={item.key} className="admin-list-in space-y-1 text-[12px]">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-md border border-border bg-bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia local */}
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-bg text-[11px] font-semibold">
                  {index + 1}
                </span>
              </span>
              <span className="block truncate font-semibold">{item.file.name}</span>
              <span className="block text-fg-muted">{megabytes(item.file.size)}</span>
              {item.progress !== null && (
                <ProgressBar value={item.progress} label={`Envio de ${item.file.name}`} />
              )}
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || remaining <= 0} className={primaryButtonClass}>
        {busy ? "Enviando…" : "Adicionar stories"}
      </button>
    </form>
  );
}
