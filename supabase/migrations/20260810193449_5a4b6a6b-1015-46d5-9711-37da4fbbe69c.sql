-- Add WhatsApp columns to shop_settings
ALTER TABLE public.shop_settings 
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS whatsapp_template_name TEXT DEFAULT 'reminder';

-- Add WhatsApp columns to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_error TEXT;

-- Refresh permissions
GRANT ALL ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
