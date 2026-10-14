import { CREATOR } from "@/lib/site";

// "Plataforma criada por <nome>", com o nome em link pro portfólio. Herda a
// cor de apoio de quem usa (texto muted, centralizado); o link tem 40 px de
// altura útil pra tocar no celular.
export function CreatorCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[12px] leading-none ${className}`}>
      Plataforma criada por{" "}
      <a
        href={CREATOR.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 items-center font-semibold underline-offset-2 hover:underline focus-visible:underline"
      >
        {CREATOR.name}
      </a>
    </p>
  );
}
