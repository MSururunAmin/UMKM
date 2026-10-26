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
php artisan serve
```

An admin account must be assigned through a trusted server-side process; public registration deliberately permits only customer and merchant roles.
