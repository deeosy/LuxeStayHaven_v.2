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
   - Install the Google Analytics Debugger Chrome extension and enable it
   - Open GA4 → Admin → DebugView
   - Navigate the site (Home → Search → Hotel → Checkout → Confirmation)
   - Look for these events: page_view, search_performed, hotel_viewed, booking_started, booking_complete
4. Verify conversion payload (booking_complete):
   - In DebugView, click the `booking_complete` event
   - Confirm parameters include: event_category=ecommerce, event_label=<bookingId>, value, currency=USD, and items[0].item_name=<hotel name>

## Sitemap / robots.txt

- `robots.txt` is served from `client/public/robots.txt`
- `sitemap.xml` is served dynamically at `/sitemap.xml`
- Submit sitemap in Google Search Console:
  - Verify `https://YOUR_DOMAIN/sitemap.xml` loads in the browser
  - Search Console → Indexing → Sitemaps → Add: `https://YOUR_DOMAIN/sitemap.xml`

---

## Documentation

Access the [LiteAPI documentation](https://docs.liteapi.travel/reference/overview) to learn more about the API.
