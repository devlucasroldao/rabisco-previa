"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import { deletePost, reorderPosts } from "@/app/admin/actions";
import type { AdminPost } from "@/lib/admin-data";
import { POST_TYPE_LABELS } from "@/lib/media";
import { moveItem } from "@/lib/presentation-rules";
import { PostForm } from "./post-form";
import { errorClass, primaryButtonClass, secondaryButtonClass } from "./ui";

const DELETE_WARNING =
  "Os números dos posts seguintes vão mudar. Se o link já foi enviado ao cliente, crie uma nova apresentação em vez de apagar posts.";

const ORDER_CHANGED_NOTE =
  "A ordem mudou. Se o link já foi enviado, avise o cliente que os números dos posts mudaram.";

// Leitor de tela em português, no lugar do inglês padrão do dnd-kit.
const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "Pra mover o post, aperte espaço ou Enter, use as setas pra cima e pra baixo e aperte espaço ou Enter de novo pra soltar. Esc cancela.",
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

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

  // Ordem otimista: vale enquanto os posts que chegam do servidor forem os
  // mesmos de quando ela foi criada. Quando o servidor manda a lista nova
  // (depois de salvar, criar ou apagar), a dele volta a valer.
  const baseKey = posts.map((post) => post.id).join(",");
  const [optimistic, setOptimistic] = useState<{ base: string; ids: string[] } | null>(
    null,
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [saving, startSaving] = useTransition();

  const byId = new Map(posts.map((post) => [post.id, post]));
  const ordered =
    optimistic && optimistic.base === baseKey
      ? optimistic.ids.flatMap((id) => byId.get(id) ?? [])
      : posts;
  const ids = ordered.map((post) => post.id);
  const numberOf = (id: string) => ids.indexOf(id) + 1;

  function save(next: string[]) {
    if (next.join(",") === ids.join(",")) return;
    setOptimistic({ base: baseKey, ids: next });
    setStatus({ kind: "saving" });
    startSaving(async () => {
      const result = await reorderPosts(presentationId, next);
      if (result.error) {
        // Volta pra ordem do servidor.
        setOptimistic(null);
        setStatus({ kind: "error", message: result.error });
      } else {
        setStatus({ kind: "saved" });
      }
    });
  }

  function move(index: number, delta: -1 | 1) {
    save(moveItem(ids, index, index + delta));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    save(moveItem(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  const sensors = useSensors(
    // A distância evita que um clique na alça vire arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Post ${numberOf(String(active.id))} pego.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Post ${numberOf(String(active.id))} sobre a posição ${numberOf(String(over.id))}.`
        : `Post ${numberOf(String(active.id))} fora da lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Post ${numberOf(String(active.id))} solto na posição ${numberOf(String(over.id))}.`
        : `Post ${numberOf(String(active.id))} solto no lugar de antes.`,
    onDragCancel: ({ active }) =>
      `Movimento cancelado. O post ${numberOf(String(active.id))} voltou pro lugar.`,
  };

  return (
    <div className="space-y-4">
      {posts.length === 0 && editing !== "new" && (
        <p className="text-[14px] text-muted">
          Nenhum post ainda. Sem posts, o link do cliente mostra que a prévia não
          existe.
        </p>
      )}
      {ordered.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
          }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-line border-y border-line">
              {ordered.map((post, index) => (
                <SortablePost
                  key={post.id}
                  id={post.id}
                  number={index + 1}
                  // Arrastar fica parado enquanto salva ou com um post aberto.
                  locked={saving || editing !== null}
                  showHandle={editing !== post.id}
                >
                  {editing === post.id ? (
                    <PostForm
                      presentationId={presentationId}
                      post={post}
                      onDone={close}
                    />
                  ) : (
                    <PostRow
                      post={post}
                      number={index + 1}
                      canMoveUp={index > 0}
                      canMoveDown={index < ordered.length - 1}
                      locked={saving || editing !== null}
                      onMove={(delta) => move(index, delta)}
                      onEdit={() => setEditing(post.id)}
                    />
                  )}
                </SortablePost>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <div aria-live="polite" className="min-h-5 text-[13px]">
        {status.kind === "saving" && <p className="text-muted">Salvando…</p>}
        {status.kind === "saved" && (
          <>
            <p className="font-medium">Ordem salva</p>
            <p className="text-muted">{ORDER_CHANGED_NOTE}</p>
          </>
        )}
        {status.kind === "error" && (
          <p role="alert" className={errorClass}>
            {status.message}
          </p>
        )}
      </div>

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

function SortablePost({
  id,
  number,
  locked,
  showHandle,
  children,
}: {
  id: string;
  number: number;
  locked: boolean;
  showHandle: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex items-center gap-3 bg-background py-3 ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      {showHandle && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={locked}
          aria-label={`Arrastar o post ${number}`}
          className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
        >
          <svg aria-hidden="true" width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="3" cy="4" r="1.6" />
            <circle cx="9" cy="4" r="1.6" />
            <circle cx="3" cy="10" r="1.6" />
            <circle cx="9" cy="10" r="1.6" />
            <circle cx="3" cy="16" r="1.6" />
            <circle cx="9" cy="16" r="1.6" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function PostRow({
  post,
  number,
  canMoveUp,
  canMoveDown,
  locked,
  onMove,
  onEdit,
}: {
  post: AdminPost;
  number: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  locked: boolean;
  onMove: (delta: -1 | 1) => void;
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
    <div className="flex items-center gap-3">
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
        onClick={() => onMove(-1)}
        disabled={locked || pending || !canMoveUp}
        aria-label={`Subir o post ${number}`}
        className={secondaryButtonClass}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={locked || pending || !canMoveDown}
        aria-label={`Descer o post ${number}`}
        className={secondaryButtonClass}
      >
        ↓
      </button>
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
