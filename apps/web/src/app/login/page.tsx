"use client";

import { ArrowRight, BadgeCheck, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, Input } from "@clone-zap/ui";

import { useSession } from "@/components/auth/session-provider";
import { loginRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { isLoading: isSessionLoading, refreshSession, session } = useSession();
  const [email, setEmail] = useState("alana@kinbox.local");
  const [password, setPassword] = useState("elite-demo");
  const [isLoading, setIsLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/inbox/all");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    setNextPath(next || "/inbox/all");
  }, []);

  useEffect(() => {
    if (!isSessionLoading && session) {
      router.replace(nextPath);
    }
  }, [isSessionLoading, nextPath, router, session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      await loginRequest({ email, password });
      await refreshSession();
      router.push(nextPath);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.25),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.2),transparent_30%)]" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_520px]">
        <section className="flex flex-col justify-between gap-8 rounded-[36px] border border-[var(--border)] bg-[var(--panel)]/75 p-8 shadow-soft backdrop-blur-xl glass-ring lg:p-10">
          <div className="space-y-6 animate-floatIn">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--panel-strong)] px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)]">
              <BadgeCheck className="size-4 text-[var(--accent)]" />
              Base operacional da Fase 1 pronta para evolucao modular
            </span>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted-foreground)]">Elite Veiculos CRM Atendimento</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight lg:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
                CRM omnichannel da Elite Veiculos com atendimento, operacao comercial e analytics em um unico shell.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--muted-foreground)] lg:text-lg">
                Esta base estabelece identidade visual, navegacao global, sessao persistente e infraestrutura para evoluir Inbox, CRM, Relatorios e Configuracoes.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Inbox", "Fila, conversa, composer e painel lateral prontos para refinamento."],
              ["CRM", "Kanban, contatos e campanhas modelados para expansao."],
              ["Reports", "Widgets, KPIs e dashboards em layout responsivo."]
            ].map(([title, description]) => (
              <Card className="p-4" key={title}>
                <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
              </Card>
            ))}
          </div>
        </section>
        <Card className="glass-ring animate-floatIn p-6 shadow-soft lg:p-8">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Acesso</p>
            <h2 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Entrar na area operacional
            </h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Use qualquer e-mail. A autenticacao agora e mantida pela API usando cookie de sessao.
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">E-mail corporativo</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input className="pl-11" onChange={(event) => setEmail(event.target.value)} value={email} />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Senha</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input className="pl-11" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
              </div>
            </label>
            <Button className="h-12 w-full justify-between rounded-2xl px-5" disabled={isLoading} type="submit">
              {isLoading ? "Entrando..." : "Entrar no workspace"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}