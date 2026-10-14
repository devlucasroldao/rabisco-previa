"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog } from "../primitives/dialog";
import { iconButtonClass } from "../ui";

// No celular e no tablet, a barra lateral vira gaveta, aberta pelo botão do
// topo. Navegar fecha a gaveta.
export function MobileNav({
  brand,
  children,
}: {
  brand: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpenAt(pathname)}
          aria-label="Abrir o menu"
          aria-expanded={open}
          className={iconButtonClass}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        {brand}
      </div>
      <Dialog open={open} onClose={() => setOpenAt(null)} title="Menu" variant="sheet">
        {children}
      </Dialog>
    </>
  );
}
