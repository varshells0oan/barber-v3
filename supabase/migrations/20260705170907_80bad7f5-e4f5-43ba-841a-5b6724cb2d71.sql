
-- Adds blocked_dates (holidays) and slot_buffer_min to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS blocked_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slot_buffer_min integer NOT NULL DEFAULT 0;

-- Trigger to prevent overlapping appointments for the same barber
CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.barber_id = NEW.barber_id
      AND a.date = NEW.date
      AND a.id <> NEW.id
      AND a.status <> 'cancelado'
      AND a.time < NEW.end_time
      AND a.end_time > NEW.time
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN: horário já reservado para este barbeiro'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_appt_overlap ON public.appointments;
CREATE TRIGGER trg_prevent_appt_overlap
  BEFORE INSERT OR UPDATE OF barber_id, date, time, end_time, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_appointment_overlap();
