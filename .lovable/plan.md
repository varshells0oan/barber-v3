# Nova estrutura de rotas multi-tenant

## Objetivo
URLs claras e hierárquicas por barbearia, sem mudar layout/design dos painéis existentes.

## Mapa final de URLs

```
/                                    Landing SaaS institucional (nova)
/auth                                 Login (existente)
/superadmin                           Painel do dono do SaaS (só você)

/:slug                                Landing da barbearia + agendar (público)
/:slug/meus-agendamentos              Cliente vê/cancela agendamentos (público)
/:slug/agendamento-confirmado         Tela de confirmação (público)

/:slug/admin                          Dashboard admin da barbearia (protegido)
/:slug/admin/agendamentos
/:slug/admin/servicos
/:slug/admin/barbeiros
/:slug/admin/clientes
/:slug/admin/financeiro
/:slug/admin/configuracoes

/:slug/barbeiro                       Painel do barbeiro (protegido)
/:slug/barbeiro/historico
/:slug/barbeiro/ganhos
```

Regras de acesso (via `_authenticated` + `has_role_in(user, role, barbershop_id)`):
- `superadmin` → acessa `/superadmin` e qualquer `/:slug/*`
- `admin` de X → só `/:slug=X/admin/*`
- `barber` de X → só `/:slug=X/barbeiro/*`
- Cliente/anônimo → `/:slug`, `/:slug/meus-agendamentos`, `/:slug/agendamento-confirmado`

## Passos de implementação

1. **Contexto de barbearia por slug**
   - Novo layout pathless `src/routes/$slug.tsx`: carrega barbershop pelo slug, disponibiliza via `BarbershopProvider` (id, nome, slug, cores). Se slug inválido → 404.
   - Substituir `getDefaultBarbershopId` por `useCurrentBarbershop()` que lê do contexto.
   - `current-barbershop.ts` passa a exportar hook baseado no contexto.

2. **Mover rotas públicas do cliente para `/:slug`**
   - `src/routes/$slug.index.tsx` ← conteúdo de `agendar.tsx`
   - `src/routes/$slug.meus-agendamentos.tsx` ← conteúdo de `meus-agendamentos.tsx`
   - `src/routes/$slug.agendamento-confirmado.tsx` ← idem
   - Remover as versões antigas na raiz.

3. **Mover admin/barbeiro para `_authenticated/$slug/`**
   - `src/routes/_authenticated/$slug.admin.tsx` (+ .index, .agendamentos, .servicos, .barbeiros, .clientes, .financeiro, .configuracoes)
   - `src/routes/_authenticated/$slug.barbeiro.tsx` (+ .index, .historico, .ganhos)
   - Cada layout valida `has_role_in(user, 'admin'|'barber', barbershopId)` antes de renderizar; redireciona `/auth` se não tiver.
   - Conteúdo dos componentes fica igual — só os imports/paths mudam.

4. **Nova landing `/`**
   - `src/routes/index.tsx` vira landing SaaS simples: título "BarberSaaS", CTA "Sou dono, quero criar minha barbearia" → `/auth`, link "Painel Superadmin" → `/superadmin` (só aparece quando logado como superadmin).
   - Também lista barbearias ativas com link para `/:slug`.

5. **Redirect no login (`auth.tsx`)**
   - `superadmin` → `/superadmin`
   - `admin` → busca `barbershop_id` do user_roles e redireciona `/:slug/admin`
   - `barber` → idem para `/:slug/barbeiro`
   - cliente → `/`

6. **Atualizar links internos**
   - Todos `<Link to="/admin/...">` viram `<Link to="/$slug/admin/..." params={{ slug }}>`.
   - `useCurrentBarbershop()` fornece slug para navegações.

7. **Validação**
   - `bun run build` para checar rotas geradas.
   - Testar fluxo: login superadmin → criar barbearia → login admin → `/minha-barbearia/admin` → cliente em `/minha-barbearia`.

## Fora de escopo
- Sem mudanças de design/cores/componentes.
- Sem alterar RLS já hardened na etapa anterior (só usar as funções `has_role_in` / `public_*`).
- Sem subdomínio por barbearia (só path).
