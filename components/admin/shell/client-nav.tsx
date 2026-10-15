"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "../avatar";

// Com mais clientes que isso, aparece o filtro.
const FILTER_FROM = 8;

type NavClient = { id: string; name: string; avatarUrl: string | null };

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ClientNav({ clients }: { clients: NavClient[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const shown = query
    ? clients.filter((client) => normalize(client.name).includes(normalize(query)))
    : clients;

  return (
    <div>
      {clients.length > FILTER_FROM && (
        <label className="relative mb-1 block px-2">
          <span className="sr-only">Filtrar clientes</span>
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4.5 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar clientes"
            className="h-9 w-full rounded-md border border-border bg-bg pr-2 pl-8 text-[13px] text-fg placeholder:text-fg-muted"
          />
        </label>
      )}
      <ul aria-label="Clientes" className="space-y-px">
        {shown.map((client) => {
          const href = `/admin/clientes/${client.id}`;
          const active = pathname === href;
          return (
            <li key={client.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-10 items-center gap-2.5 rounded-md px-3 text-[14px] transition-colors duration-(--dur-fast) hover:bg-hover ${
                  active ? "bg-active font-semibold text-fg" : "text-fg"
                }`}
              >
                {/* Filete mostarda do item ativo. */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-brand-2"
                  />
                )}
                <Avatar url={client.avatarUrl} size={24} />
                <span className="truncate">{client.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {query && shown.length === 0 && (
        <p className="px-3 py-2 text-[13px] text-fg-muted">Nenhum cliente com esse nome.</p>
      )}
    </div>
  );
}
