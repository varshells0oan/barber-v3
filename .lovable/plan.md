
# Lembretes de agendamento via WhatsApp

## Como funciona (visão leiga)

A cada X minutos, um "robô" no servidor olha a agenda, encontra agendamentos que estão a Y horas de acontecer, e dispara uma mensagem pro WhatsApp do cliente. Se já enviou, não envia de novo.

## Escolha do provedor (precisa decidir)

Não dá pra mandar WhatsApp de graça direto — precisa de um provedor oficial. Três caminhos:

1. **Twilio WhatsApp API** — oficial, pago por mensagem (~R$0,30). Requer aprovar template de mensagem. Robusto, escala bem. **Recomendado pra venda com volume.**
2. **Meta Cloud API (WhatsApp Business)** — oficial da Meta, mais barato (~R$0,15). Setup mais chato (Business Manager, número verificado, template aprovado).
3. **Evolution API / Z-API / não-oficiais** — usa WhatsApp Web por trás. Barato/grátis, mas **risco de banir o número** e instável. Não recomendo pra produto pago.

Sugestão: **Meta Cloud API** (custo/benefício) ou **Twilio** (facilidade).

## Arquitetura técnica

```text
[pg_cron a cada 5min]
        ↓
[POST /api/public/hooks/send-reminders]  (rota TanStack)
        ↓
  busca appointments onde:
   - status in ('pendente','confirmado')
   - date+time entre agora+Xh e agora+Xh+5min
   - reminder_sent_at IS NULL
        ↓
  pra cada um: envia WhatsApp via provedor
        ↓
  marca reminder_sent_at = now()
```

## Mudanças no banco

Migration adiciona em `appointments`:
- `reminder_sent_at timestamptz` — evita duplicar envio
- (opcional) `reminder_error text` — pra debug

E em `shop_settings`:
- `whatsapp_reminders_enabled boolean default false`
- `whatsapp_reminder_hours_before int default 2` — dono escolhe (ex: 2h, 24h)
- `whatsapp_reminder_template text` — texto customizável com `{cliente}`, `{horario}`, `{barbeiro}`, `{barbearia}`

## Arquivos a criar/mudar

1. **Migration** — colunas novas + GRANTs
2. **`src/routes/api/public/hooks/send-reminders.ts`** — rota que o cron chama, autenticada por apikey anon, valida janela, envia via provedor, marca enviado
3. **`src/lib/whatsapp.server.ts`** — wrapper do provedor escolhido (isola SDK)
4. **Cron job** (via `supabase--insert`) — `pg_cron` a cada 5min chamando a rota
5. **Admin → Configurações** — nova seção "Lembretes WhatsApp": toggle liga/desliga, quantas horas antes, editor de template com preview
6. **Secrets** — credenciais do provedor (Meta: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`; Twilio: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`)

## Custo e limites

- Cada mensagem custa (R$0,15–R$0,30). Precisa decidir se: (a) você absorve no preço da mensalidade, (b) cobra à parte, (c) barbearia usa API própria dela.
- Template precisa ser **pré-aprovado** pelo WhatsApp — não dá pra mandar texto livre em conversa iniciada pelo negócio.

## Perguntas antes de eu escrever código

1. **Qual provedor?** Meta Cloud API, Twilio, ou você prefere que eu recomende e siga com um?
2. **Quem paga as mensagens?** Você (embutido no plano) ou cada barbearia coloca a chave dela?
3. **Quanto tempo antes?** Fixo (ex: 2h) ou configurável por barbearia? (sugiro configurável)
4. **Só lembrete, ou também confirmação na hora do agendamento?** (ex: "Recebemos seu agendamento pra amanhã 14h")

Me responde essas 4 e eu detalho o plano final com os arquivos exatos.
