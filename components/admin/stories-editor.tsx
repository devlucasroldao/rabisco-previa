"use client";

import { useState, useTransition } from "react";
import {
  deleteStory,
  moveStory,
  saveStories,
  setStoryDay,
} from "@/app/admin/actions";
import type { AdminStory } from "@/lib/admin-data";
import { resizePostImage } from "@/lib/image";
import {
  IMAGE_INPUT_TYPES,
  IMAGE_OUTPUT_TYPE,
  megabytes,
  presentationFolder,
} from "@/lib/media";
import {
  formatStoryDay,
  groupByDay,
  STORY_INPUT_MAX_BYTES,
  STORY_MAX_PER_PRESENTATION,
} from "@/lib/stories";
import { removeFromBucket, uploadToBucket } from "@/lib/upload";
import { ProgressBar } from "./progress-bar";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

const DELETE_WARNING =
  "Excluir este story? Os números dos stories seguintes vão mudar. Se o link já foi enviado ao cliente, avise no WhatsApp.";

const fileInputClass =
  "mt-1 block w-full text-[13px] text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground";

export function StoriesEditor({
  presentationId,
  stories,
}: {
  presentationId: string;
  stories: AdminStory[];
}) {
  // A lista já vem em ordem de dia e de position; o número sai dela.
  const numbered = stories.map((story, index) => ({ ...story, number: index + 1 }));
  const days = groupByDay(numbered);

  return (
    <div className="space-y-6">
      {days.length === 0 ? (
        <p className="text-[14px] text-muted">
          Nenhum story ainda. Eles aparecem pro cliente ao tocar na foto do perfil.
        </p>
      ) : (
        days.map((group) => (
          <section key={group.day} aria-label={formatStoryDay(group.day)}>
            <h3 className="mb-2 text-[14px] font-semibold">{formatStoryDay(group.day)}</h3>
            <ol className="divide-y divide-line border-y border-line">
              {group.stories.map((story, index) => (
                <li key={story.id} className="py-2">
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

function StoryRow({
  story,
  first,
  last,
}: {
  story: AdminStory & { number: number };
  first: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { number } = story;

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-5 text-center text-[14px] font-semibold tabular-nums">{number}</span>
      <span className="block aspect-[9/16] h-20 shrink-0 overflow-hidden rounded border border-line bg-surface">
        {story.url && (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada, que expira
          <img src={story.url} alt={`Story ${number}`} className="h-full w-full object-cover" />
        )}
      </span>
      <label className="text-[13px]">
        <span className="sr-only">Dia do story {number}</span>
        <input
          type="date"
          value={story.day}
          required
          disabled={pending}
          onChange={(event) => {
            const day = event.target.value;
            if (day) run(() => setStoryDay(story.id, day));
          }}
          className="rounded-md border border-line bg-background px-2 py-1"
        />
      </label>
      <span className="flex flex-1 justify-end gap-2">
        <button
          type="button"
          onClick={() => run(() => moveStory(story.id, -1))}
          disabled={pending || first}
          aria-label={`Subir o story ${number}`}
          className={secondaryButtonClass}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => run(() => moveStory(story.id, 1))}
          disabled={pending || last}
          aria-label={`Descer o story ${number}`}
          className={secondaryButtonClass}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(DELETE_WARNING)) run(() => deleteStory(story.id));
          }}
          disabled={pending}
          aria-label={`Excluir o story ${number}`}
          className={secondaryButtonClass}
        >
          {pending ? "…" : "Excluir"}
        </button>
      </span>
      {error && (
        <p role="alert" className={`basis-full ${errorClass}`}>
          {error}
        </p>
      )}
    </div>
  );
}

type Picked = { key: string; file: File; progress: number | null };

function AddStories({ presentationId, existing }: { presentationId: string; existing: number }) {
  const [day, setDay] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const remaining = STORY_MAX_PER_PRESENTATION - existing;

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    // A ordem da seleção é a ordem dos stories no dia.
    const files = [...(event.currentTarget.files ?? [])];
    setError(null);
    const invalid = files.find((file) => !IMAGE_INPUT_TYPES.includes(file.type));
    if (invalid) {
      setError(`"${invalid.name}" precisa ser JPG, PNG ou WebP.`);
      event.currentTarget.value = "";
      return;
    }
    const tooBig = files.find((file) => file.size > STORY_INPUT_MAX_BYTES);
    if (tooBig) {
      setError(
        `"${tooBig.name}" tem ${megabytes(tooBig.size)} e o limite é ${megabytes(STORY_INPUT_MAX_BYTES)}.`,
      );
      event.currentTarget.value = "";
      return;
    }
    if (files.length > remaining) {
      setError(
        `Uma apresentação tem até ${STORY_MAX_PER_PRESENTATION} stories. Cabem mais ${remaining}.`,
      );
      event.currentTarget.value = "";
      return;
    }
    setPicked(files.map((file) => ({ key: crypto.randomUUID(), file, progress: null })));
  }

  function setProgress(key: string, progress: number | null) {
    setPicked((current) =>
      current.map((item) => (item.key === key ? { ...item, progress } : item)),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
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
      setPicked([]);
      form.reset();
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
      className="space-y-4 rounded-lg border border-line p-4"
    >
      <h3 className="text-[14px] font-semibold">Adicionar stories</h3>
      <label className={labelClass}>
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
      <label className={labelClass}>
        Artes dos stories (JPG, PNG ou WebP, 9:16, até {megabytes(STORY_INPUT_MAX_BYTES)} cada)
        <input
          type="file"
          accept={IMAGE_INPUT_TYPES.join(",")}
          multiple
          onChange={choose}
          disabled={busy || remaining <= 0}
          className={fileInputClass}
        />
      </label>
      {picked.length > 0 && (
        <ol className="space-y-2">
          {picked.map((item, index) => (
            <li key={item.key} className="space-y-1 text-[13px]">
              <span className="block truncate">
                {index + 1}. {item.file.name}
              </span>
              {item.progress !== null && (
                <ProgressBar value={item.progress} label={`Envio de ${item.file.name}`} />
              )}
            </li>
          ))}
        </ol>
      )}
      {remaining <= 0 && (
        <p className="text-[13px] text-muted">
          Esta apresentação já tem {STORY_MAX_PER_PRESENTATION} stories, o máximo.
        </p>
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
