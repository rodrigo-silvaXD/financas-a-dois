# Finanças a Dois

PWA de controle financeiro compartilhado do casal.

## Estrutura

```
app-financeiro-casal/
├── frontend/   # Next.js 14 + TS + Tailwind + Framer Motion + PWA
└── backend/    # Fastify + TS + Supabase + Anthropic Claude Haiku 4.5
```

## Rodar

```bash
# frontend
cd frontend && npm run dev            # http://localhost:3000

# backend
cd backend && cp .env.example .env    # preencha as chaves
npm run dev                            # http://localhost:3333
```

## Stack

- **Frontend**: Next.js 14 (App Router) · TypeScript strict · TailwindCSS · Framer Motion · lucide-react · @ducanh2912/next-pwa
- **Backend**: Fastify 5 · TypeScript · @supabase/supabase-js · @anthropic-ai/sdk · zod · dotenv
- **Infra**: Supabase (Postgres + Auth + RLS) · Anthropic Claude Haiku 4.5 (chamada só do backend)
