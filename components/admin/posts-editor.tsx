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
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  GalleryHorizontal,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePost, reorderPosts } from "@/app/admin/actions";
import type { AdminPost } from "@/lib/admin-data";
import { POST_TYPE_LABELS, type PostType } from "@/lib/media";
import { moveItem } from "@/lib/presentation-rules";
import { PostForm } from "./post-form";
import { ActionMenu } from "./primitives/action-menu";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import { Dialog } from "./primitives/dialog";
import { EmptyState } from "./primitives/empty-state";
import { buttonClass } from "./ui";

const DELETE_WARNING =
  "Os números dos posts seguintes vão mudar. Se o link já foi enviado ao cliente, crie uma nova apresentação em vez de apagar posts.";

const ORDER_CHANGED_NOTE =
  "A ordem mudou. Se o link já foi enviado, avise o cliente que os números dos posts mudaram.";

// Leitor de tela em português, no lugar do inglês padrão do dnd-kit.
const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "Pra mover o post, aperte espaço ou Enter, use as setas pra cima e pra baixo e aperte espaço ou Enter de novo pra soltar. Esc cancela.",
};

const TYPE_ICONS: Record<PostType, React.ReactNode> = {
  post: <ImageIcon size={14} aria-hidden="true" />,
  carousel: <GalleryHorizontal size={14} aria-hidden="true" />,
  reels: <Clapperboard size={14} aria-hidden="true" />,
};

// Ação que aparece no hover no desktop e fica sempre visível no toque.
const revealClass =
  "transition-opacity duration-(--dur-fast) [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100";

export function PostsEditor({
  presentationId,
  posts,
}: {
  presentationId: string;
  posts: AdminPost[];
}) {
  // Id do post em edição, "new" pro formulário de novo post, ou nada aberto.
  const [editing, setEditing] = useState<string | null>(null);
  const [formLocked, setFormLocked] = useState(false);
  const close = useCallback(() => setEditing(null), []);

  // Ordem otimista: vale enquanto os posts que chegam do servidor forem os
  // mesmos de quando ela foi criada. Quando o servidor manda a lista nova
  // (depois de salvar, criar ou apagar), a dele volta a valer.
  const baseKey = posts.map((post) => post.id).join(",");
  const [optimistic, setOptimistic] = useState<{ base: string; ids: string[] } | null>(null);
  const [saving, startSaving] = useTransition();

  // Exclusão: a linha fica "Excluindo…" até o servidor responder e some com
  // a lista nova. Uma por vez.
  const [confirmDelete, setConfirmDelete] = useState<{ post: AdminPost; number: number } | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const byId = new Map(posts.map((post) => [post.id, post]));
  const ordered =
    optimistic && optimistic.base === baseKey
      ? optimistic.ids.flatMap((id) => byId.get(id) ?? [])
      : posts;
  const locked = saving || deleting;
  const ids = ordered.map((post) => post.id);
  const numberOf = (id: string) => ids.indexOf(id) + 1;
  const editingPost = editing && editing !== "new" ? byId.get(editing) : undefined;

  function remove(post: AdminPost, number: number) {
    setConfirmDelete(null);
    setDeletingId(post.id);
    startDeleting(async () => {
      const result = await deletePost(post.id);
      setDeletingId(null);
      if (result.error) toast.error(`O post ${number} não foi excluído.`, { description: result.error });
      else toast.success(`Post ${number} excluído.`);
    });
  }

  function save(next: string[]) {
    if (next.join(",") === ids.join(",")) return;
    setOptimistic({ base: baseKey, ids: next });
    startSaving(async () => {
      const result = await reorderPosts(presentationId, next);
      if (result.error) {
        // Volta pra ordem do servidor.
        setOptimistic(null);
        toast.error("A ordem não foi salva.", { description: result.error });
      } else {
        toast.success("Ordem salva", { description: ORDER_CHANGED_NOTE });
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
      {posts.length === 0 ? (
        <EmptyState title="Nenhum post ainda">
          Sem posts nem stories, o link do cliente mostra que a prévia não existe.
        </EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-border border-y border-border">
              {ordered.map((post, index) => (
                <SortablePost
                  key={post.id}
                  post={post}
                  number={index + 1}
                  // Arrastar fica parado enquanto salva ou exclui.
                  locked={locked}
                  pending={deletingId === post.id}
                  isFirst={index === 0}
                  isLast={index === ordered.length - 1}
                  onMove={(delta) => move(index, delta)}
                  onEdit={() => setEditing(post.id)}
                  onDelete={() => setConfirmDelete({ post, number: index + 1 })}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <button type="button" onClick={() => setEditing("new")} className={buttonClass("primary")}>
        <Plus size={16} aria-hidden="true" />
        Adicionar post
      </button>

      <Dialog
        open={editing !== null}
        onClose={() => {
          if (!formLocked) close();
        }}
        dismissible={!formLocked}
        title={editingPost ? `Editar o post ${numberOf(editingPost.id)}` : "Novo post"}
        description="Os arquivos vão direto pro armazenamento. O post só é salvo quando todos terminarem de subir."
        variant="panel"
      >
        {editing !== null && (
          <PostForm
            // Abrir outro post recomeça o formulário do zero.
            key={editing}
            presentationId={presentationId}
            post={editingPost}
            onDone={close}
            onLockedChange={setFormLocked}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete ? `Excluir o post ${confirmDelete.number}?` : "Excluir o post?"}
        description={DELETE_WARNING}
        confirmLabel="Excluir"
        pendingLabel="Excluindo…"
        onConfirm={() => confirmDelete && remove(confirmDelete.post, confirmDelete.number)}
      />
    </div>
  );
}

function SortablePost({
  post,
  number,
  locked,
  pending,
  isFirst,
  isLast,
  onMove,
  onEdit,
  onDelete,
}: {
  post: AdminPost;
  number: number;
  locked: boolean;
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id, disabled: locked });

  const first = post.media[0];
  const thumbnail = first?.kind === "video" ? first.posterUrl : first?.url;
  const typeLabel =
    post.type === "carousel"
      ? `${POST_TYPE_LABELS.carousel} · ${post.media.length} imagens`
      : POST_TYPE_LABELS[post.type];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={pending || undefined}
      className={`group admin-list-in relative flex items-center gap-2 bg-bg py-2.5 pr-1 transition-opacity duration-(--dur-base) sm:gap-3 ${
        isDragging ? "z-10 rounded-lg shadow-md" : ""
      } ${pending ? "pointer-events-none opacity-50" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={locked}
        aria-label={`Arrastar o post ${number}`}
        className={`flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-muted hover:bg-hover active:cursor-grabbing disabled:cursor-default ${revealClass}`}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <span className="w-5 shrink-0 text-center text-[14px] font-semibold tabular-nums">{number}</span>
      <span className="block h-14 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-bg-subtle sm:h-16 sm:w-12">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada, que expira
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="shrink-0 text-fg-muted">{TYPE_ICONS[post.type]}</span>
          <span className="truncate">{typeLabel}</span>
        </span>
        <span className="line-clamp-1 text-[13px] whitespace-pre-line text-fg-muted sm:line-clamp-2">
          {pending ? "Excluindo…" : post.caption || "Sem legenda"}
        </span>
      </span>
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        aria-label={`Editar o post ${number}`}
        className={`${buttonClass("ghost")} hidden [@media(hover:hover)]:sm:inline-flex ${revealClass}`}
      >
        <Pencil size={15} aria-hidden="true" />
        Editar
      </button>
      <ActionMenu
        label={`Ações do post ${number}`}
        disabled={pending}
        actions={[
          { label: "Editar", icon: <Pencil size={16} />, onSelect: onEdit },
          { label: "Subir", icon: <ArrowUp size={16} />, onSelect: () => onMove(-1), disabled: locked || isFirst },
          { label: "Descer", icon: <ArrowDown size={16} />, onSelect: () => onMove(1), disabled: locked || isLast },
          { label: "Excluir", icon: <Trash2 size={16} />, onSelect: onDelete, danger: true, disabled: locked },
        ]}
      />
    </li>
  );
}
