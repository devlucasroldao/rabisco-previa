"use client";

import { Upload } from "lucide-react";
import { useId, useState } from "react";

// Área de arrastar e soltar com clique alternativo. Por baixo continua um
// <input type="file"> de verdade (acessível pelo rótulo e pelo teclado), e os
// arquivos soltos chegam pelo mesmo onFiles.
export function Dropzone({
  label,
  hint,
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  compact = false,
}: {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const id = useId();
  const [over, setOver] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (disabled) return;
          const files = [...event.dataTransfer.files];
          if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
        }}
        className={`admin-dropzone flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-center transition-colors duration-(--dur-fast) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${
          compact ? "min-h-20 px-4 py-3" : "min-h-32 px-6 py-6"
        } ${
          over
            ? "border-accent bg-accent-subtle"
            : "border-border-strong bg-bg-subtle hover:border-accent hover:bg-hover"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
        data-over={over ? "" : undefined}
      >
        <Upload size={compact ? 18 : 22} aria-hidden="true" className="admin-dropzone-icon text-fg-muted" />
        <span className="text-[14px] font-semibold text-fg">{label}</span>
        <span className="text-[13px] text-fg-muted">
          Arraste {multiple ? "os arquivos" : "o arquivo"} pra cá ou clique pra escolher
        </span>
        {hint && <span className="text-[12px] text-fg-muted">{hint}</span>}
        <input
          id={id}
          type="file"
          // O nome do campo é só o rótulo (o resto é instrução).
          aria-label={label}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.currentTarget.files ?? [])];
            // Limpa pra poder escolher o mesmo arquivo de novo.
            event.currentTarget.value = "";
            if (files.length > 0) onFiles(files);
          }}
        />
      </label>
    </div>
  );
}
