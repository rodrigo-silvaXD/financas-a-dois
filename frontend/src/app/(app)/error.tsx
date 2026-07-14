"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";

// Route Error Boundary do App Router. Captura erros de render/effect
// em qualquer descendente do grupo (app). Dispara toast e mostra fallback.
export default function AppError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  const toast = useToast();

  useEffect(() => {
    toast.error(error.message || "Algo deu errado");
    // Silencia log em produção; útil em dev.
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error, toast]);

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-danger/10 text-danger">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-heading text-ink">Algo deu errado</h1>
        <p className="mt-2 text-body text-ink-muted">{error.message || "Erro inesperado."}</p>
        <div className="mt-6">
          <Button onClick={reset}>
            <RefreshCw size={16} /> Tentar de novo
          </Button>
        </div>
      </div>
    </main>
  );
}
