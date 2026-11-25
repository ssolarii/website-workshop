# Website Workshop

Website Workshop is a single-page visual website editor. The blank starter opens with a page title, and the Personal, Portfolio, and Event starters use editable placeholder copy. Insert adds individual elements and section layouts. Outline handles section order. Format opens the options for the current selection. Source View shows the generated HTML and CSS.

## Run locally

Use **My sites** in the top-left corner to create, search, and reopen sites. Edits autosave to localStorage, with IndexedDB as the full-draft backup for larger image collections. The **Outline → Themes** menu applies a palette, typeface, and optional header photo; changes can be undone. Select a section in Outline to move or delete it.

Insert includes text, image/text, two-, three-, and four-image layouts, headers, and full-width photos. In Format, image controls include width and cropping. Upload a JPEG, PNG, or WebP, drop a file onto the canvas, or choose **Use camera**. Camera permission is requested only when opening the camera and its stream stops when closed. Images are resized to at most 1600 pixels and compressed below 600 KB for the Firestore asset limit. Header backgrounds support uploads, starter photos, and HTTPS URLs, with automatic white text and a dark contrast overlay.

**Second screen** opens a separate browser window with independently toggleable Preview, HTML, and QR panels. Edits synchronize while the editor stays open. The QR code appears only after successful publication and opens the published snapshot; unpublished edits remain private. Move the window to the other monitor using the operating system. Closing it does not affect drafts.

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
