import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Trash2, RefreshCw } from "lucide-react";

/** Envia imagem para o armazenamento da barbearia e devolve um link de longa duração. */
export function ImageUpload({ barbershopId, value, onChange, label = "Enviar logo", folder = "logo", round }: {
  barbershopId: string; value?: string | null; onChange: (url: string | null) => void; label?: string; folder?: string; round?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast.error("Envie uma imagem (JPG, PNG ou WEBP)");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 5 MB)");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${barbershopId}/${folder}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("shop-media").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return toast.error("Não foi possível enviar a imagem"); }
    const { data } = await supabase.storage.from("shop-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setBusy(false);
    if (!data?.signedUrl) return toast.error("Não foi possível enviar a imagem");
    onChange(data.signedUrl);
    toast.success("Imagem enviada");
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-border bg-muted ${round ? "rounded-full" : "rounded-lg"}`}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => ref.current?.click()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm disabled:opacity-60">
          {value ? <RefreshCw className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}{busy ? "Enviando…" : value ? "Trocar" : label}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />Remover
          </button>
        )}
      </div>
    </div>
  );
}
