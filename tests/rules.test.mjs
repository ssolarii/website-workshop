import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
test(
  "draft ownership, publication, and referenced image access",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const env = await initializeTestEnvironment({
      projectId: "demo-website-workshop",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
      storage: { rules: readFileSync("storage.rules", "utf8") },
    });
    try {
      const a = env.authenticatedContext("alice"),
        b = env.authenticatedContext("bob"),
        guest = env.unauthenticatedContext();
      const site = { version: 1, id: "test-site", title: "Test", sections: [] };
      const asset = "a".repeat(64);
      const media = (who, hash = asset) =>
        doc(who.firestore(), "drafts", site.id, "media", hash);
      const draft = writeBatch(a.firestore());
      draft.set(doc(a.firestore(), "drafts", site.id), {
        owner: "alice",
        site,
      });
      draft.set(media(a), { data: "data:image/webp;base64,AAAA" });
      draft.set(media(a, "b".repeat(64)), {
        data: "data:image/webp;base64,BBBB",
      });
      await assertSucceeds(draft.commit());
      await assertSucceeds(getDoc(media(a)));
      await assertFails(getDoc(media(guest)));
      await assertFails(getDoc(media(b)));
      await assertFails(
        setDoc(media(b), { data: "data:image/webp;base64,CCCC" }),
      );
      await assertFails(
        setDoc(media(a), { data: "data:image/webp;base64,CCCC" }),
      );
      await assertFails(getDoc(doc(b.firestore(), "drafts", site.id)));
      await assertFails(getDoc(doc(guest.firestore(), "drafts", site.id)));
      await assertFails(
        setDoc(doc(b.firestore(), "drafts", site.id), { owner: "bob", site }),
      );
      const path = "images/test-site/test.webp";
      await assertSucceeds(
        uploadBytes(ref(a.storage(), path), new Uint8Array([1]), {
          contentType: "image/webp",
        }),
      );
      await assertFails(getBytes(ref(guest.storage(), path)));
      await assertSucceeds(
        setDoc(doc(a.firestore(), "published", site.id), {
          owner: "alice",
          site,
          assets: [path, asset],
        }),
      );
      await assertSucceeds(
        getDoc(doc(guest.firestore(), "published", site.id)),
      );
      await assertFails(getDocs(collection(guest.firestore(), "published")));
      await assertSucceeds(getDoc(media(guest)));
      await assertFails(getDoc(media(guest, "b".repeat(64))));
      await assertSucceeds(getBytes(ref(guest.storage(), path)));
      await assertFails(deleteDoc(doc(b.firestore(), "published", site.id)));
      await assertSucceeds(deleteDoc(doc(a.firestore(), "published", site.id)));
      await assertFails(getBytes(ref(guest.storage(), path)));
      await assertFails(getDoc(media(guest)));
    } finally {
      await env.cleanup();
    }
  },
);
