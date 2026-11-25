# UMKM Marketplace API

Laravel 11 REST API for the Culinary UMKM marketplace.

## Phase 1 included

- Laravel 11 with Laravel Sanctum personal-access-token authentication
- User roles (`customer`, `merchant`, `admin`) and role middleware
- Database schema and Eloquent relationships for users, merchants, categories, products, orders, and order items
- Auth endpoints under `/api/v1/auth`: `register`, `login`, `logout`, and `me`

## Local configuration

The included `.env` is configured for a local MySQL instance with database name `umkm_marketplace` and the usual Laragon/XAMPP root user (no password). Create that database first, then adjust `DB_HOST`, `DB_PORT`, `DB_USERNAME`, or `DB_PASSWORD` if your MySQL setup differs. Run:

```bash
php artisan migrate
php artisan serve --host=localhost --port=8000
```

An admin account must be assigned through a trusted server-side process; public registration deliberately permits only customer and merchant roles.

For local development on this computer, use `http://localhost:8000` for `APP_URL`, `http://localhost:3000` for `FRONTEND_URL`, and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` in `frontend/.env.local`. Start the frontend with `npm run dev` from `frontend`, then open `http://localhost:3000`. To use another device, replace `localhost` with this computer's network address in these settings and allow the services through Windows Firewall.

## Midtrans Snap payments

Configure `MIDTRANS_SERVER_KEY` in the Laravel environment. For sandbox, use a Sandbox server key (`SB-Mid-server-...`) and leave `MIDTRANS_IS_PRODUCTION=false`. For production, use the matching Production server key (`Mid-server-...`) and set `MIDTRANS_IS_PRODUCTION=true`. Do not put the server key in frontend configuration; the frontend redirects to the hosted payment URL returned by Midtrans.

In the Midtrans dashboard, enable Snap Redirect and set its finish redirect URL to `http://localhost:3000/payment/finish` for local development (use the deployed frontend URL in production). Set the payment notification URL to `https://<api-host>/api/v1/payments/midtrans/notification`. The local finish page finds the order and opens its detail page; payment status is updated only by the API after verifying Midtrans notifications. Expose the API over HTTPS in production.
