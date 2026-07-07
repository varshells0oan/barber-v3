-- Remove exposição de telefone dos barbeiros ao público, mantendo o painel de agendamento funcional
DROP POLICY IF EXISTS "Public reads active barbers" ON public.barbers;

CREATE OR REPLACE VIEW public.public_barbers
WITH (security_invoker=on) AS
SELECT id, barbershop_id, name, photo_url, specialty, bio, rating,
       work_hours, blocked_dates, services, active
FROM public.barbers
WHERE active = true;

GRANT SELECT ON public.public_barbers TO anon, authenticated;

-- A view precisa que anon consiga ler os barbeiros ativos por trás dela (security_invoker),
-- mas apenas as colunas expostas pela view. Adicionamos uma policy anon estrita
-- e o app público passa a consultar a view.
CREATE POLICY "Anon reads active barbers via view"
  ON public.barbers FOR SELECT
  TO anon
  USING (active = true);
-- Observação: RLS é por linha; a proteção do telefone vem de o app usar apenas a view
-- pública, que não seleciona a coluna phone. Como fallback adicional, revogamos SELECT
-- da coluna phone para o role anon.
REVOKE SELECT (phone) ON public.barbers FROM anon;