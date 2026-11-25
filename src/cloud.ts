import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
  deleteDoc,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getBlob,
  getMetadata,
  connectStorageEmulator,
} from "firebase/storage";
import { safeImage, type SiteDocument } from "./model";
import { portableGalleryUrl } from "./images";

const env = (import.meta as unknown as { env: Record<string, string> }).env;
const useStorage = env.VITE_ASSET_MODE === "storage";
export const configured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID,
);
const app = configured
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
      appId: env.VITE_FIREBASE_APP_ID || undefined,
    })
  : null;
const auth = app && getAuth(app);
const db = app && getFirestore(app);
const storage = app && useStorage ? getStorage(app) : null;
if (env.VITE_USE_EMULATORS === "true" && auth && db) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  if (storage) connectStorageEmulator(storage, "127.0.0.1", 9199);
}
let login: Promise<string> | undefined;
async function owner() {
  if (!auth) throw Error("Connect a Firebase project to publish.");
  return (login ??= auth
    .authStateReady()
    .then(
      async () =>
        auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid,
    )
    .catch((error) => {
      login = undefined;
      throw error;
    }));
}

const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
const imageHash = async (blob: Blob) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

function validSiteId(value: string) {
  return /^w?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
const validImageId = (value: string) => /^[0-9a-f]{64}$/.test(value);
const pictureElements = (site: SiteDocument) =>
  site.sections
    .flatMap(({ elements }) => elements)
    .filter(({ type }) => type === "image");
const uploadedImages = new Set<string>();

async function saveNow(site: SiteDocument) {
  const uid = await owner();
  const copy = structuredClone(site);
  const draft = doc(db!, "drafts", site.id);
  const batch = writeBatch(db!);
  const assetIds = new Set<string>();
  const storagePaths = new Set<string>();
  const newlyUploaded = new Set<string>();
  const images = pictureElements(copy);
  if (
    images.filter(
      (image) => image.imageRef || image.src.startsWith("data:image/"),
    ).length > 10
  ) {
    throw Error("A website can contain up to ten uploaded images.");
  }
  if (storage) {
    // Storage writes consult the draft's Firestore owner before accepting bytes.
    await setDoc(
      draft,
      { owner: uid, site: { version: 1, id: site.id, title: site.title } },
      { merge: true },
    );
  }
  for (const image of images) {
    image.src = portableGalleryUrl(image.src);
    if (!image.src.startsWith("data:image/")) {
      if (image.imageRef && validImageId(image.imageRef))
        assetIds.add(image.imageRef);
      continue;
    }
    const src = safeImage(image.src);
    if (!src)
      throw Error(
        "An uploaded image is invalid. Replace it before publishing.",
      );
    const blob = await (await fetch(src)).blob();
    const imageId = await imageHash(blob);
    const key = site.id + "/" + imageId;
    if (storage) {
      const path = "images/" + key + ".webp";
      if (!uploadedImages.has(key) && !newlyUploaded.has(key)) {
        const object = ref(storage, path);
        try {
          await getMetadata(object);
        } catch (error) {
          if ((error as { code?: string }).code !== "storage/object-not-found")
            throw error;
          await uploadBytes(object, blob, { contentType: "image/webp" });
        }
        newlyUploaded.add(key);
      }
      const host =
        env.VITE_USE_EMULATORS === "true"
          ? "http://127.0.0.1:9199"
          : "https://firebasestorage.googleapis.com";
      image.src =
        host +
        "/v0/b/" +
        storage.app.options.storageBucket +
        "/o/" +
        encodeURIComponent(path) +
        "?alt=media";
      delete image.imageRef;
      storagePaths.add(path);
    } else {
      if (src.length > 850000) {
        throw Error(
          "An uploaded image is over the cloud size limit. Replace it with a smaller image.",
        );
      }
      if (!uploadedImages.has(key) && !newlyUploaded.has(key)) {
        batch.set(doc(draft, "media", imageId), { data: src });
        newlyUploaded.add(key);
      }
      image.src = "";
      image.imageRef = imageId;
      assetIds.add(imageId);
    }
  }
  batch.set(draft, { owner: uid, site: copy });
  await batch.commit();
  for (const key of newlyUploaded) uploadedImages.add(key);
  return { site: copy, assets: [...assetIds, ...storagePaths] };
}

let saving: Promise<unknown> = Promise.resolve();
export function save(site: SiteDocument) {
  const copy = structuredClone(site);
  const next = saving.catch(() => {}).then(() => saveNow(copy));
  saving = next;
  return next;
}

export function publicUrl(id: string) {
  const url = new URL(env.VITE_PUBLIC_URL || location.href);
  url.search = "";
  url.hash = id;
  return url.href;
}

export async function publish(site: SiteDocument) {
  const uid = await owner();
  const snapshot = await save(site);
  await setDoc(doc(db!, "published", site.id), { owner: uid, ...snapshot });
  return publicUrl(site.id);
}

export async function unpublish(id: string) {
  await owner();
  await deleteDoc(doc(db!, "published", id));
}

async function loadImages(site: SiteDocument, privateDraft = false) {
  const copy = structuredClone(site);
  const photos = new Map<string, Promise<string>>();
  await Promise.all(
    pictureElements(copy).map(async (image) => {
      if (image.imageRef && validImageId(image.imageRef)) {
        const imageId = image.imageRef;
        if (!photos.has(imageId)) {
          photos.set(
            imageId,
            getDocFromServer(
              doc(db!, "drafts", site.id, "media", imageId),
            ).then((snap) =>
              typeof snap.data()?.data === "string"
                ? safeImage(snap.data()!.data)
                : "",
            ),
          );
        }
        image.src = (await photos.get(imageId)) ?? "";
        if (!image.src && privateDraft)
          throw Error("A saved image could not be loaded.");
      } else if (privateDraft && storage) {
        const path =
          image.src &&
          new URL(image.src, location.href).pathname.split("/o/")[1];
        if (path && decodeURIComponent(path).startsWith(`images/${site.id}/`)) {
          image.src = await dataUrl(
            await getBlob(ref(storage, decodeURIComponent(path))),
          );
        }
      }
    }),
  );
  return copy;
}

export async function read(id: string) {
  if (!validSiteId(id)) throw Error("This site link is invalid.");
  if (!db) throw Error("Publishing has not been connected.");
  const snap = await getDocFromServer(doc(db, "published", id));
  if (!snap.exists()) throw Error("This website is unavailable.");
  return loadImages(snap.data().site as SiteDocument);
}

export async function drafts() {
  const uid = await owner();
  const snaps = await getDocs(
    query(collection(db!, "drafts"), where("owner", "==", uid)),
  );
  return snaps.docs
    .map((draft) => draft.data().site as SiteDocument)
    .filter((site) => Array.isArray(site.sections));
}

export async function hydrate(site: SiteDocument) {
  await owner();
  return loadImages(site, true);
}
