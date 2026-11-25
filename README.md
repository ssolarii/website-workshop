# Website Workshop

Website Workshop is a single-page visual website editor. The blank starter opens with a page title, and the Personal, Portfolio, and Event starters use editable placeholder copy. Insert adds individual elements and section layouts. Outline handles section order. Format opens the options for the current selection. Source View shows the generated HTML and CSS.

## Run locally

Run `npm install` and `npm run dev`, then open http://127.0.0.1:5173/. Run `npm run build -- --base=./` for a production build and `npm test` for generator tests.

The editor and generated pages use locally installed Helvetica Now Display, with Helvetica and Arial in the fallback stack. A separately licensed webfont is needed to serve Helvetica Now Display to visitors who lack it.

## Publishing

The GitHub Actions workflow publishes the editor to https://ssolarii.github.io/website-workshop/. It uses repository variables from `.env.example`. The Firebase web app belongs to `sitebuilder-4f048`, with Anonymous Authentication and Firestore in the `nam5` region. A published URL ends in the site's ID after `#`.

The running Spark configuration uses Firestore for image assets. The editor compresses uploaded images to WebP before saving. Drafts live in IndexedDB and sync to Firestore under the anonymous browser identity. Published snapshots and their referenced images are readable by link. Private drafts, unpublished images, and collection listings are protected by `firestore.rules`. Deleting a publication withdraws public access for subsequent requests.

To test locally with emulators, use project `demo-website-workshop`, set `VITE_USE_EMULATORS=true` and demo values in the Vite environment, then run `firebase emulators:start --project demo-website-workshop`. With `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`, run `npm run test:rules`. The optional Storage adapter uses `VITE_ASSET_MODE=storage` and its own bucket and rules.

## Starter photos

- [Lakeside by Kalen Emsley](https://unsplash.com/photos/woman-sitting-on-dock-bridge-near-lake-during-daytime-uQ6ocPD59nU)
- [Architecture by Victor](https://unsplash.com/photos/low-angle-photo-of-concrete-building-JYiTP2GZhqM)
- [Meeting by Beatriz Cattel](https://unsplash.com/photos/business-meeting-with-people-around-a-conference-table-3tCLyPBSQ5k)

Photos are available under the [Unsplash License](https://unsplash.com/license).

