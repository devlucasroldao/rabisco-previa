import {
  Clapperboard,
  Image,
  Images,
  Megaphone,
  Smartphone,
  Target,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { CONTENT_TYPE_LABEL } from "@/lib/calendar-constants";
import type { ContentType } from "@/lib/types";

const ICON: Record<ContentType, LucideIcon> = {
  post: Image,
  carrossel: Images,
  reels: Clapperboard,
  story: Smartphone,
  campanha: Megaphone,
  anuncio: Target,
  enquete: Vote,
};

export function ContentTypeIcon({
  type,
  size = 14,
}: {
  type: ContentType;
  size?: number;
}) {
  const Icon = ICON[type];
  return <Icon size={size} aria-hidden="true" />;
}

// O ícone distingue o tipo; a pastilha fica neutra de propósito. Sete tipos em
// sete cores viraria arco-íris, e o fundo tirado de currentColor acompanha
// tanto o tema do painel (data-admin-theme) quanto o da página do cliente
// (prefers-color-scheme), que não compartilham tokens.
export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="inline-flex w-[104px] shrink-0 items-center gap-1.5 rounded-md bg-current/10 px-2 py-1 text-[11px] font-semibold">
      <ContentTypeIcon type={type} />
      {CONTENT_TYPE_LABEL[type]}
    </span>
  );
}
