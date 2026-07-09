## Objetivo

Trocar o login por e-mail (Supabase Auth) por um sistema **usuário + senha simples**, controlado por você (superadmin) para donos de barbearia e pelo dono para cada barbeiro. Adicionar **pausas por dia da semana** para barbeiros.

## Escopo em 3 partes

### 1. Superadmin (você) continua igual
- Login `superadmin@icloud.com` + senha (Supabase Auth) **permanece**, só pra você. É a única porta que usa e-mail.
- Motivo: você precisa de um jeito seguro de entrar; trocar isso também seria overkill.

### 2. Dono da barbearia (admin) — novo login usuário+senha
- No painel superadmin, ao criar/editar barbearia, você define `admin_username` + `admin_password`.
- Nova rota pública `/{slug}/entrar` com formulário "usuário e senha".
- Servidor valida via RPC (senha guardada com hash bcrypt no banco), devolve um token de sessão que fica em `localStorage` (`bs_admin_token_{slug}`).
- Rotas `/{slug}/admin/*` deixam de exigir Supabase Auth e passam a exigir esse token.
- Trocar slug na URL não dá acesso: cada barbearia tem seu próprio token/senha.

### 3. Barbeiro — login opcional
- No painel do dono, cada barbeiro ganha campos opcionais `access_username` + `access_password`.
- Se em branco → `/{slug}/barbeiro` fica aberto (comportamento atual).
- Se preenchido → mesma tela de login (`/{slug}/barbeiro/entrar`), token em `localStorage`.

### 4. Pausas por dia da semana
- Adicionar coluna `breaks jsonb` em `barbers`: `{ "1": [{start:"12:00",end:"13:00"}], "3": [...] }` (chave = dia da semana 0-6).
- UI no editor de barbeiro: por dia, botão "adicionar pausa" com dois campos de hora.
- Backend `create_public_appointment` e cálculo de slots disponíveis passam a excluir horários que caem dentro de qualquer pausa daquele dia.

## Detalhes técnicos

**Migração SQL:**
- `ALTER TABLE barbershops ADD admin_username text, admin_password_hash text`
- `ALTER TABLE barbers ADD access_username text, access_password_hash text, breaks jsonb DEFAULT '{}'::jsonb`
- Extensão `pgcrypto` (já disponível) para `crypt()` + `gen_salt('bf')`
- RPCs SECURITY DEFINER:
  - `set_barbershop_admin_credentials(barbershop_id, username, password)` — só superadmin
  - `set_barber_credentials(barber_id, username, password | null)` — dono da barbearia
  - `verify_barbershop_admin(slug, username, password)` → retorna `{token, barbershop_id}` se OK
  - `verify_barber_access(slug, username, password)` → idem
  - `verify_session_token(token)` → retorna barbershop_id/barber_id (validação em cada request)
- Nova tabela `access_sessions(token uuid pk, barbershop_id, barber_id nullable, kind text, expires_at)` — tokens opacos, 30 dias.

**Frontend:**
- Novo hook `useShopAuth(slug, kind)` que lê token do localStorage e valida no servidor.
- `_authenticated/route.tsx` (integração Supabase) fica **só** para `/superadmin`. Mover `$slug.admin.*` e `$slug.barbeiro.*` para fora de `_authenticated/`, com guard próprio via `useShopAuth`.
- Novas rotas: `src/routes/$slug.entrar.tsx` (login admin), `src/routes/$slug.barbeiro.entrar.tsx` (login barbeiro).
- Editor de barbearia (superadmin) ganha campos de credencial do dono.
- Editor de barbeiro (admin) ganha campos opcionais de credencial + UI de pausas por dia.

**Rotas de agendamento público:**
- `/{slug}` (cliente) segue **100% público**, sem mudança.
- Cálculo de slots disponíveis passa a considerar `breaks[dow]`.

## Fora de escopo (não vou mexer)
- Superadmin login (segue com Supabase Auth).
- Convites por e-mail (`aceitar-convite`) — vou desativar a UI porque o fluxo novo é você digitar usuário/senha direto.
- Recuperação de senha (você reescreve manualmente pelo superadmin se alguém esquecer).

## Ordem de execução
1. Migração SQL (colunas + tabela de sessões + RPCs).
2. Mover rotas admin/barbeiro para fora de `_authenticated/`.
3. Hook `useShopAuth` + telas de login.
4. Campos de credencial no superadmin (barbearia) e admin (barbeiro).
5. UI de pausas por dia + integração no cálculo de slots.
6. Limpar botão "Superadmin"/convites da UI do dono.

Confirma que posso seguir?
