# Local Platform Layer

Voyago MVP runs without Supabase. All domain data is in `localStorage` (`voyago:platform-v1`).

## Demo accounts

Password for all: `demo1234`

| Email | Role |
|-------|------|
| tourist@voyago.demo | TOURIST |
| premium@voyago.demo | PREMIUM_TOURIST |
| operator@voyago.demo | OPERATOR_ADMIN |
| manager@voyago.demo | OPERATOR_MANAGER |
| pending@voyago.demo | OPERATOR_ADMIN (pending org) |
| admin@voyago.demo | PLATFORM_ADMIN |

## Swap to Supabase later

1. Keep service classes (`SearchService`, adapters, booking).
2. Replace `store.ts` load/save with Supabase queries.
3. Move auth to Supabase Auth; map `profiles` / `user_roles`.
4. Enable RLS per TZ §46–47.
