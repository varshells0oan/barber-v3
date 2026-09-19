import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint: envia lembretes de WhatsApp para agendamentos próximos.
 * Chamar a cada 5-15 minutos por um agendador externo.
 */
export const Route = createFileRoute("/api/public/whatsapp-cron")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("shop_settings")
          .select(
            "barbershop_id, whatsapp_enabled, whatsapp_api_token, whatsapp_phone_id, whatsapp_reminder_hours, whatsapp_template_name",
          )
          .eq("whatsapp_enabled", true);

        if (settingsError) {
          return Response.json({ error: settingsError.message }, { status: 500 });
        }

        let sent = 0;
        let failed = 0;

        for (const s of settings ?? []) {
          const token = s.whatsapp_api_token;
          const phoneId = s.whatsapp_phone_id;
          if (!token || !phoneId) continue;

          const hours = Number(s.whatsapp_reminder_hours ?? 2);
          const now = new Date();
          const until = new Date(now.getTime() + hours * 3600_000);
          const dayKey = (d: Date) =>
            new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

          const { data: appts, error: apptError } = await supabaseAdmin
            .from("appointments")
            .select("id, date, time, client_phone, client_name")
            .eq("barbershop_id", s.barbershop_id)
            .eq("status", "confirmed")
            .or("whatsapp_reminder_sent.is.null,whatsapp_reminder_sent.eq.false")
            .gte("date", dayKey(now))
            .lte("date", dayKey(until));

          if (apptError) {
            failed += 1;
            continue;
          }

          for (const appt of appts ?? []) {
            // Horário local da barbearia (America/Sao_Paulo, UTC-3).
            const startsAt = new Date(`${appt.date}T${appt.time.slice(0, 5)}:00-03:00`);
            if (startsAt < now || startsAt > until) continue;

            const phone = (appt.client_phone ?? "").replace(/\D/g, "");
            if (!phone) continue;

            try {
              const res = await fetch(
                `https://graph.facebook.com/v21.0/${phoneId}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: phone.startsWith("55") ? phone : `55${phone}`,
                    type: "template",
                    template: {
                      name: s.whatsapp_template_name || "lembrete_agendamento",
                      language: { code: "pt_BR" },
                      components: [
                        {
                          type: "body",
                          parameters: [
                            { type: "text", text: appt.client_name ?? "Cliente" },
                            {
                              type: "text",
                              text: startsAt.toLocaleString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              }),
                            },
                          ],
                        },
                      ],
                    },
                  }),
                },
              );

              if (!res.ok) {
                const body = await res.text();
                failed += 1;
                await supabaseAdmin
                  .from("appointments")
                  .update({ whatsapp_reminder_error: `[${res.status}] ${body}`.slice(0, 500) })
                  .eq("id", appt.id);
                continue;
              }

              await supabaseAdmin
                .from("appointments")
                .update({ whatsapp_reminder_sent: true, whatsapp_reminder_error: null })
                .eq("id", appt.id);
              sent += 1;
            } catch (err) {
              failed += 1;
              await supabaseAdmin
                .from("appointments")
                .update({
                  whatsapp_reminder_error: String(err instanceof Error ? err.message : err).slice(0, 500),
                })
                .eq("id", appt.id);
            }
          }
        }

        return Response.json({ ok: true, sent, failed });
      },
    },
  },
});
