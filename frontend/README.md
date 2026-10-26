This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## UMKM maps

Leaflet renders the public UMKM map and seller location picker with OpenStreetMap tiles. Configure `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` to select a different compatible tile provider; attribution must remain visible and accurate. The default is the public OpenStreetMap tile service. Follow its [usage policy](https://operations.osmfoundation.org/policies/tiles/): avoid bulk/offline tile use, respect cache headers, and use another provider for sustained production traffic.

The Laravel API uses server-side OpenStreetMap Nominatim address search and reverse geocoding for store locations. Configure `NOMINATIM_URL`, `NOMINATIM_SEARCH_URL`, and an identifying `NOMINATIM_USER_AGENT` in the backend environment. If PHP's configured CA file is missing or invalid, set `NOMINATIM_CA_BUNDLE` to a readable PEM bundle path; TLS certificate verification remains enabled. Address matches move the map marker, but the server still validates selected coordinates against the administrative area when the store location is saved. This is a community-mapped location check, not government verification; failed lookups do not allow store registration.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
