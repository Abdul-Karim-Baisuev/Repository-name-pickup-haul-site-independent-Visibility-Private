DELETE FROM public.user_roles
WHERE user_id = '00000000-0000-0000-0000-0000000000ad'
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = user_roles.user_id);