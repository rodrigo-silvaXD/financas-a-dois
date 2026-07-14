"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { TopBar } from "@/components/ui";
import { TransactionForm, type TransactionDraft } from "@/components/TransactionForm";
import { saveTransaction } from "@/lib/transactions";
import { useToast } from "@/components/Toast";
import type { Category } from "@/lib/types";

export default function NovoManualPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("categories").select("*").eq("user_id", user.id).order("ordem")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, [user]);

  async function onSubmit(draft: TransactionDraft) {
    if (!user) return;
    await saveTransaction(user.id, draft);
    toast.success("Salvo");
    router.replace("/");
  }

  return (
    <main>
      <TopBar title="Lançamento manual" showBack />
      <section className="mx-auto max-w-md px-5 pt-4 pb-8">
        <TransactionForm categorias={cats} onSubmit={onSubmit} cancelHref="/novo" />
      </section>
    </main>
  );
}
