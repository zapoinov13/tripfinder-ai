-- Test accounts for App Store / Google Play review (local demo + Supabase)
-- Password for both: Test1234!
-- Run in Supabase SQL Editor after enabling email auth.

-- Review tourist: tourist@test.tourgo.app
-- Review operator: operator@test.tourgo.app (linked to first approved org in seed)

COMMENT ON TABLE public.profiles IS 'TourGo profiles. Review logins: tourist@test.tourgo.app / operator@test.tourgo.app (Test1234!)';

-- If using Supabase Auth, create users via Dashboard → Authentication → Users → Add user,
-- then upsert profiles:
--
-- INSERT INTO public.profiles (id, email, name, city, role, status)
-- VALUES
--   ('<tourist-auth-uuid>', 'tourist@test.tourgo.app', 'Review Tourist', 'Алматы', 'TOURIST', 'active'),
--   ('<operator-auth-uuid>', 'operator@test.tourgo.app', 'Review Operator', 'Алматы', 'OPERATOR_ADMIN', 'active')
-- ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
