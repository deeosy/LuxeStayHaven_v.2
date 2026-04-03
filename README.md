# Example of using LiteAPI to create a webapp

## Install

1. Install Node.js from https://nodejs.org/en/download/
2. Run `npm install` to install the dependencies.

## Run

1. Copy `.env.example` to `.env` and add your LiteAPI keys for production and sandbox.
1. Run `npm run start` to start the server.
2. Access http://localhost:3000/ in your browser.

---

## Analytics (GA4)

1. Create a Google Analytics 4 property and copy your Measurement ID (looks like `G-XXXXXXXXXX`).
2. Copy `client/.env.example` to `client/.env` and set:
   - `VITE_GA4_ID=G-XXXXXXXXXX`
3. Start the app and verify events in GA4:
   - GA4 → Admin → DebugView (use the Google Analytics Debugger extension or append `?debug_mode=true` in GA4 config if needed)
   - Events tracked: page_view, search_performed, hotel_viewed, booking_started, booking_complete

## Sitemap / robots.txt

- `robots.txt` is served from `client/public/robots.txt`
- `sitemap.xml` is served dynamically at `/sitemap.xml`
- Submit sitemap in Google Search Console:
  - Indexing → Sitemaps → Add: `https://YOUR_DOMAIN/sitemap.xml`

---

## Documentation

Access the [LiteAPI documentation](https://docs.liteapi.travel/reference/overview) to learn more about the API.
