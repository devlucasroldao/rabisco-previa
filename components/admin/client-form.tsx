"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClient, setClientAvatar } from "@/app/admin/actions";
import type { AdminClient } from "@/lib/admin-data";
import { resizeAvatar } from "@/lib/image";
import { avatarPath, IMAGE_INPUT_TYPES, IMAGE_OUTPUT_TYPE } from "@/lib/media";
import { uploadToBucket } from "@/lib/upload";
import { Avatar } from "./avatar";
import { ProgressBar } from "./progress-bar";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "./ui";

export function ClientForm({ client }: { client?: AdminClient }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Foto já recortada e convertida, esperando o Salvar.
  const [avatar, setAvatar] = useState<{ blob: Blob; url: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(null);
    setSaved(false);
    if (!file) {
      setAvatar(null);
      return;
    }
    try {
      const blob = await resizeAvatar(file);
      setAvatar({ blob, url: URL.createObjectURL(blob) });
    } catch (cause) {
      input.value = "";
      setAvatar(null);
      setError(cause instanceof Error ? cause.message : "Não deu pra ler a foto.");
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await saveClient({
        id: client?.id,
        name: String(form.get("name") ?? ""),
        handle: String(form.get("handle") ?? ""),
        bio: String(form.get("bio") ?? ""),
      });
      if (result.error || !result.id) {
        setError(result.error ?? "Não deu pra salvar.");
        return;
      }

      if (avatar) {
        try {
          setProgress(0);
          await uploadToBucket(avatarPath(result.id), avatar.blob, IMAGE_OUTPUT_TYPE, {
            upsert: true,
            onProgress: setProgress,
          });
          const avatarResult = await setClientAvatar(result.id);
          if (avatarResult.error) throw new Error(avatarResult.error);
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : "erro no envio";
          setError(`O cliente foi salvo, mas a foto não. ${detail}`);
          setProgress(null);
          if (!client) router.push(`/admin/clientes/${result.id}`);
          return;
        }
        setProgress(null);
      }

      if (client) setSaved(true);
      else router.push(`/admin/clientes/${result.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[520px] space-y-4">
      <label className={labelClass}>
        Nome
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={client?.name}
          placeholder="Conecte Telecom"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        @ do Instagram (sem o @)
        <input
          name="handle"
          required
          maxLength={30}
          defaultValue={client?.handle}
          placeholder="seconecte2021"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`${inputClass} lowercase`}
        />
      </label>
      <label className={labelClass}>
        Bio
        <textarea
          name="bio"
          rows={4}
          maxLength={300}
          defaultValue={client?.bio}
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-4">
        <Avatar url={avatar?.url ?? client?.avatarUrl} size={72} />
        <label className={`flex-1 ${labelClass}`}>
          Foto do perfil
          <input
            name="avatar"
            type="file"
            accept={IMAGE_INPUT_TYPES.join(",")}
            onChange={onAvatarChange}
            disabled={pending}
            className="mt-1 block w-full text-[13px] text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground"
          />
          <span className="mt-1 block text-[12px] font-normal text-muted">
            {avatar
              ? "Prévia da foto nova. Ela só vale depois de salvar."
              : "JPG, PNG ou WebP. É recortada no centro, em quadrado."}
          </span>
        </label>
      </div>
      {progress !== null && <ProgressBar value={progress} label="Enviando a foto" />}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Salvando…" : client ? "Salvar" : "Criar cliente"}
        </button>
        {saved && !pending && (
          <p role="status" className="text-[13px] text-muted">
            Salvo.
          </p>
        )}
      </div>
    </form>
  );
}
