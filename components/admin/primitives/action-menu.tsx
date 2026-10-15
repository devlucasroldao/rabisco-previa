"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { iconButtonClass } from "../ui";

export type MenuAction = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  // Destrutivo: texto em --danger, sempre por último.
  danger?: boolean;
  disabled?: boolean;
};

const itemClass =
  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[14px] text-fg outline-none data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[highlighted]:bg-hover";

// O menu abre num portal dentro de .admin: herda os tokens, não é cortado
// por contêiner com overflow e não fica preso à animação de entrada da linha.
function adminRoot(): HTMLElement | undefined {
  // No servidor não há document (o menu só abre no navegador).
  if (typeof document === "undefined") return undefined;
  return document.querySelector<HTMLElement>(".admin") ?? undefined;
}

// Menu "⋯" das linhas e do cabeçalho.
export function ActionMenu({
  label,
  actions,
  disabled = false,
}: {
  // Nome acessível do botão, ex.: "Ações do post 3".
  label: string;
  actions: MenuAction[];
  disabled?: boolean;
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={label}
        disabled={disabled}
        className={iconButtonClass}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal container={adminRoot()}>
        <Menu.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="admin-menu z-50 min-w-48 rounded-lg border border-border bg-bg p-1.5 shadow-md"
        >
          {actions.map((action, index) => (
            <div key={action.label}>
              {action.danger && index > 0 && (
                <Menu.Separator className="my-1 h-px bg-border" />
              )}
              <Menu.Item
                onSelect={action.onSelect}
                disabled={action.disabled}
                className={`${itemClass} ${action.danger ? "text-danger" : ""}`}
              >
                {action.icon && (
                  <span
                    className={action.danger ? "text-danger" : "text-fg-muted"}
                  >
                    {action.icon}
                  </span>
                )}
                {action.label}
              </Menu.Item>
            </div>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
