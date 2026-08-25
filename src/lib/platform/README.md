# Local Platform Layer

TourGo MVP runs without Supabase. All domain data is in `localStorage` (`tourgo:platform-v1`).

## Demo accounts

Password for all: `demo1234` (только локальный демо-стор; вход по нему
работает исключительно в dev-сборке — в проде фолбэк отключён)

| Email                | Role                         |
| -------------------- | ---------------------------- |
| tourist@tourgo.demo  | TOURIST                      |
| premium@tourgo.demo  | PREMIUM_TOURIST              |
| operator@tourgo.demo | OPERATOR_ADMIN               |
| manager@tourgo.demo  | OPERATOR_MANAGER             |
| pending@tourgo.demo  | OPERATOR_ADMIN (pending org) |
| admin@tourgo.demo    | PLATFORM_ADMIN               |

## Swap to Supabase later

1. Keep service classes (`SearchService`, adapters, booking).
2. Replace `store.ts` load/save with Supabase queries.
3. Move auth to Supabase Auth; map `profiles` / `user_roles`.
4. Enable RLS per TZ §46–47.
