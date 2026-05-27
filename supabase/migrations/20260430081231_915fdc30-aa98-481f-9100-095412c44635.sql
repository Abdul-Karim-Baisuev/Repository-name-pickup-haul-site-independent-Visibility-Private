CREATE POLICY "Public can view whatsapp template"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key = 'whatsapp_message_template');

INSERT INTO public.app_settings (key, value)
VALUES ('whatsapp_message_template', 'Hi! I''d like to ask about a pickup truck hauling job.')
ON CONFLICT (key) DO NOTHING;