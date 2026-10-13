"use client";

import { useState, useTransition } from "react";
import { deletePost } from "@/app/admin/actions";
import type { AdminPost } from "@/lib/admin-data";
import { POST_TYPE_LABELS } from "@/lib/media";
import { PostForm } from "./post-form";
import { errorClass, primaryButtonClass, secondaryButtonClass } from "./ui";

const DELETE_WARNING =
  "Os números dos posts seguintes vão mudar. Se o link já foi enviado ao cliente, crie uma nova apresentação em vez de apagar posts.";

export function PostsEditor({
  presentationId,
  posts,
}: {
  presentationId: string;
  posts: AdminPost[];
}) {
  // Id do post em edição, "new" pro formulário de novo post, ou nada aberto.
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);

  return (
    <div className="space-y-4">
      {posts.length === 0 && editing !== "new" && (
        <p className="text-[14px] text-muted">
          Nenhum post ainda. Sem posts, o link do cliente mostra que a prévia não
          existe.
        </p>
      )}
      {posts.length > 0 && (
        <ol className="divide-y divide-line border-y border-line">
          {posts.map((post, index) => (
            <li key={post.id} className="py-3">
              {editing === post.id ? (
                <PostForm presentationId={presentationId} post={post} onDone={close} />
              ) : (
                <PostRow
                  post={post}
                  number={index + 1}
                  onEdit={() => setEditing(post.id)}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      {editing === "new" ? (
        <PostForm presentationId={presentationId} onDone={close} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={primaryButtonClass}
        >
          Adicionar post
        </button>
      )}
    </div>
  );
}

function PostRow({
  post,
  number,
  onEdit,
}: {
  post: AdminPost;
  number: number;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const first = post.media[0];
  const thumbnail = first?.kind === "video" ? first.posterUrl : first?.url;
  const typeLabel =
    post.type === "carousel"
      ? `${POST_TYPE_LABELS.carousel} · ${post.media.length} imagens`
      : POST_TYPE_LABELS[post.type];

  function onDelete() {
    if (!window.confirm(DELETE_WARNING)) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <span className="w-5 text-center text-[14px] font-semibold tabular-nums">
        {number}
      </span>
      <span className="block h-20 w-15 shrink-0 overflow-hidden rounded border border-line bg-surface">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada, que expira
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{typeLabel}</span>
        <span className="line-clamp-2 text-[13px] whitespace-pre-line text-muted">
          {post.caption || "Sem legenda"}
        </span>
        {error && (
          <span role="alert" className={`block ${errorClass}`}>
            {error}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        aria-label={`Editar o post ${number}`}
        className={secondaryButtonClass}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label={`Excluir o post ${number}`}
        className={secondaryButtonClass}
      >
        {pending ? "Excluindo…" : "Excluir"}
      </button>
    </div>
  );
}
