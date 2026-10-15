"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AdminClient } from "@/lib/admin-data";
import { ClientForm } from "./client-form";
import { DeleteClient } from "./delete-client";
import { ActionMenu } from "./primitives/action-menu";
import { Dialog } from "./primitives/dialog";
import { buttonClass } from "./ui";

// Ações do cabeçalho do cliente: editar num painel lateral e excluir num
// dialog que pede o @.
export function ClientActions({ client }: { client: AdminClient }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary")}>
        <Pencil size={16} aria-hidden="true" />
        Editar cliente
      </button>
      <ActionMenu
        label="Ações do cliente"
        actions={[
          {
            label: "Excluir cliente",
            icon: <Trash2 size={16} />,
            onSelect: () => setDeleting(true),
            danger: true,
          },
        ]}
      />
      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar cliente" variant="panel">
        {editing && <ClientForm client={client} onSaved={() => setEditing(false)} />}
      </Dialog>
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Excluir cliente?"
        description="Apaga o cliente, todas as apresentações dele, os posts e os arquivos. Os links já enviados param de funcionar. Não dá pra desfazer."
      >
        {deleting && <DeleteClient id={client.id} handle={client.handle} />}
      </Dialog>
    </>
  );
}
