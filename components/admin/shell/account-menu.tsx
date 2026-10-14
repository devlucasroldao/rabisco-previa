"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { logout } from "@/app/admin/actions";
import {
  parseTheme,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/admin-theme";
import {
  STORAGE_PENDING,
  STORAGE_UNAVAILABLE,
  useStored,
  writeStored,
} from "@/lib/story-storage";

const THEME_ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: <Sun size={16} aria-hidden="true" />,
  dark: <Moon size={16} aria-hidden="true" />,
  system: <Monitor size={16} aria-hidden="true" />,
};

// Terracota ou mostarda, escolhido por um hash simples do e-mail: a mesma
// pessoa sempre vê a mesma cor. Nenhum e-mail fica no código.
function avatarTone(email: string): "a" | "b" {
  let hash = 0;
  for (const char of email) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 2 === 0 ? "a" : "b";
}

const itemClass =
  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[14px] text-fg outline-none data-[highlighted]:bg-hover";

export function AccountMenu({ email }: { email: string }) {
  const logoutForm = useRef<HTMLFormElement>(null);
  const raw = useStored(THEME_STORAGE_KEY);
  const theme = parseTheme(raw === STORAGE_PENDING || raw === STORAGE_UNAVAILABLE ? null : raw);
  const tone = avatarTone(email);
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <>
      <form ref={logoutForm} action={logout} className="hidden" />
      <Menu.Root>
        <Menu.Trigger
          aria-label="Menu da conta"
          className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left transition-colors duration-(--dur-fast) hover:bg-hover data-[state=open]:bg-hover"
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
            style={{
              background: `var(--avatar-${tone}-bg)`,
              color: `var(--avatar-${tone}-fg)`,
            }}
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{email}</span>
          <ChevronsUpDown size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
        </Menu.Trigger>

        {/* Sem Portal: o menu fica dentro de .admin e herda os tokens. */}
        <Menu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="admin-menu z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg border border-border bg-bg p-1.5 shadow-md"
        >
          <Menu.Label className="px-2.5 pt-1 pb-2 text-[12px] text-fg-muted">
            <span className="block truncate">{email}</span>
          </Menu.Label>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Label className="px-2.5 pt-1.5 pb-1 text-[12px] font-semibold text-fg-muted">
            Tema
          </Menu.Label>
          <Menu.RadioGroup
            value={theme}
            onValueChange={(value) => writeStored(THEME_STORAGE_KEY, value)}
          >
            {(Object.keys(THEME_LABELS) as ThemeChoice[]).map((choice) => (
              <Menu.RadioItem
                key={choice}
                value={choice}
                // Trocar o tema não fecha o menu: dá pra comparar.
                onSelect={(event) => event.preventDefault()}
                className={itemClass}
              >
                <span className="text-fg-muted">{THEME_ICONS[choice]}</span>
                <span className="flex-1">{THEME_LABELS[choice]}</span>
                <Menu.ItemIndicator>
                  <Check size={16} aria-hidden="true" className="text-accent" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item asChild className={itemClass}>
            <Link href="/admin/conta">
              <KeyRound size={16} aria-hidden="true" className="text-fg-muted" />
              Trocar senha
            </Link>
          </Menu.Item>
          <Menu.Item onSelect={() => logoutForm.current?.requestSubmit()} className={itemClass}>
            <LogOut size={16} aria-hidden="true" className="text-fg-muted" />
            Sair
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </>
  );
}
