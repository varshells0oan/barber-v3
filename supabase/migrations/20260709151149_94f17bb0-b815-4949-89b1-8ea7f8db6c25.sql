
CREATE OR REPLACE VIEW public.public_barbers AS
SELECT id, barbershop_id, name, photo_url, specialty, bio, rating,
       work_hours, blocked_dates, services, active, breaks
  FROM public.barbers
 WHERE active = true;
