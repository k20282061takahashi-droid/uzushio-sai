import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export type BoothType =
  | "alumni"
  | "shop"
  | "class"
  | "grade"
  | "club"
  | "info"
  | "volunteer";

export type BoothGenre =
  | "food"
  | "attraction"
  | "exhibit"
  | "performance"
  | "sales"
  | "info_session"
  | "other";

export const GENRE_LABELS: Record<BoothGenre, string> = {
  food: "飲食",
  attraction: "アトラクション",
  exhibit: "展示",
  performance: "パフォーマンス・ステージ",
  sales: "物販",
  info_session: "説明会",
  other: "その他",
};

export const BOOTH_TYPE_LABELS: Record<BoothType, string> = {
  alumni: "同窓会・後援会",
  shop: "売店",
  class: "クラス企画",
  grade: "学年企画",
  club: "部活動",
  info: "学校説明",
  volunteer: "有志企画",
};

export type BoothStatus = "open" | "break" | "closed";

export type Booth = {
  id: string;
  name: string; // クラス名・団体名
  projectName: string | null; // 企画名
  type: BoothType;
  status: BoothStatus;
  accessToken: string;
  description: string;
  location: string | null;
  floor: number | null;
  hasWaiting: boolean;
  waitingGroups: number | null;
  timePerGroup: number | null;
  genre: BoothGenre | null;
  isSetupDone: boolean;
  signboardUrl: string | null;
};

export async function getBoothByToken(token: string): Promise<Booth | null> {
  const q = query(
    collection(db, "booths"),
    where("accessToken", "==", token),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    name: data.name ?? "",
    projectName: data.projectName ?? null,
    type: data.type,
    status: (data.status as BoothStatus) ?? "open",
    accessToken: data.accessToken,
    description: data.description ?? "",
    location: data.location ?? null,
    floor: data.floor ?? null,
    hasWaiting: !!data.hasWaiting,
    waitingGroups: data.waitingGroups ?? null,
    timePerGroup: data.timePerGroup ?? null,
    genre: data.genre ?? null,
    isSetupDone: !!data.isSetupDone,
    signboardUrl: data.signboardUrl ?? null,
  };
}

// 運営ダッシュボード用。全企画をリアルタイムで一覧購読する。
export function subscribeBooths(
  callback: (booths: Booth[]) => void,
): () => void {
  return onSnapshot(collection(db, "booths"), (snap) => {
    const booths = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        projectName: data.projectName ?? null,
        type: data.type,
        status: (data.status as BoothStatus) ?? "open",
        accessToken: data.accessToken,
        description: data.description ?? "",
        location: data.location ?? null,
        floor: data.floor ?? null,
        hasWaiting: !!data.hasWaiting,
        waitingGroups: data.waitingGroups ?? null,
        timePerGroup: data.timePerGroup ?? null,
        genre: data.genre ?? null,
        isSetupDone: !!data.isSetupDone,
        signboardUrl: data.signboardUrl ?? null,
      } satisfies Booth;
    });
    booths.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    callback(booths);
  });
}

export async function updateBooth(
  id: string,
  fields: Partial<
    Pick<
      Booth,
      | "description"
      | "genre"
      | "waitingGroups"
      | "timePerGroup"
      | "isSetupDone"
      | "status"
      | "signboardUrl"
      | "projectName"
    >
  >,
) {
  await updateDoc(doc(db, "booths", id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadSignboardImage(
  boothId: string,
  file: File,
): Promise<string> {
  const fileRef = ref(storage, `booths/${boothId}/signboard`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export type LostItem = {
  boothId: string;
  boothName: string;
  description: string;
  foundLocation: string;
  storageLocation: string;
  photoUrl: string | null;
};

export async function uploadLostItemImage(
  lostItemId: string,
  file: File,
): Promise<string> {
  const fileRef = ref(storage, `lostItems/${lostItemId}/photo`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function registerLostItem(item: LostItem, photo: File | null) {
  const docRef = doc(collection(db, "lostItems"));
  const photoUrl = photo ? await uploadLostItemImage(docRef.id, photo) : null;
  await setDoc(docRef, {
    ...item,
    photoUrl,
    status: "unclaimed",
    createdAt: serverTimestamp(),
  });
}

export type LostItemRecord = LostItem & {
  id: string;
  status: "unclaimed" | "claimed";
};

// 運営ダッシュボード用。落とし物をリアルタイムで一覧購読する。
export function subscribeLostItems(
  callback: (items: LostItemRecord[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "lostItems"), orderBy("createdAt", "desc")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            boothId: data.boothId ?? "",
            boothName: data.boothName ?? "",
            description: data.description ?? "",
            foundLocation: data.foundLocation ?? "",
            storageLocation: data.storageLocation ?? "",
            photoUrl: data.photoUrl ?? null,
            status: data.status === "claimed" ? "claimed" : "unclaimed",
          };
        }),
      );
    },
  );
}

export async function markLostItemClaimed(id: string) {
  await updateDoc(doc(db, "lostItems", id), { status: "claimed" });
}

export type EmergencyAlert = {
  boothId: string;
  boothName: string;
  message: string;
};

export type EmergencyAlertRecord = EmergencyAlert & {
  id: string;
  status: "open" | "resolved";
  createdAt: number | null;
};

export async function sendEmergencyAlert(alert: EmergencyAlert) {
  await addDoc(collection(db, "emergencyAlerts"), {
    ...alert,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

// 運営ダッシュボード用。緊急連絡をリアルタイムで一覧購読する。
export function subscribeEmergencyAlerts(
  callback: (alerts: EmergencyAlertRecord[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "emergencyAlerts"), orderBy("createdAt", "desc")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            boothId: data.boothId ?? "",
            boothName: data.boothName ?? "",
            message: data.message ?? "",
            status: data.status === "resolved" ? "resolved" : "open",
            createdAt: data.createdAt?.toMillis?.() ?? null,
          };
        }),
      );
    },
  );
}

export async function resolveEmergencyAlert(id: string) {
  await updateDoc(doc(db, "emergencyAlerts", id), { status: "resolved" });
}

export type FestivalPhase = "before" | "during";

// 運営が操作する全体スイッチ。settings/festival の phase フィールドで
// 「文化祭前」か「文化祭中」かを全企画共通で切り替える。
export function subscribeFestivalPhase(
  callback: (phase: FestivalPhase) => void,
): () => void {
  return onSnapshot(doc(db, "settings", "festival"), (snap) => {
    const phase = snap.data()?.phase;
    callback(phase === "during" ? "during" : "before");
  });
}

export async function setFestivalPhase(phase: FestivalPhase) {
  await setDoc(
    doc(db, "settings", "festival"),
    { phase, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number | null;
};

// 企画担当者向けの連絡。来場者アプリの「お知らせ」（announcementsコレクション）とは別物。
export async function getStaffAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(
    query(collection(db, "staffAnnouncements"), orderBy("createdAt", "desc"), limit(20)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      body: data.body ?? "",
      pinned: !!data.pinned,
      createdAt: data.createdAt?.toMillis?.() ?? null,
    };
  });
}

// 運営ダッシュボード用。企画担当者向けの連絡をリアルタイムで一覧購読する。
export function subscribeStaffAnnouncements(
  callback: (announcements: Announcement[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "staffAnnouncements"), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? "",
            body: data.body ?? "",
            pinned: !!data.pinned,
            createdAt: data.createdAt?.toMillis?.() ?? null,
          };
        }),
      );
    },
  );
}

export async function createStaffAnnouncement(input: {
  title: string;
  body: string;
  pinned: boolean;
}) {
  await addDoc(collection(db, "staffAnnouncements"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function deleteStaffAnnouncement(id: string) {
  await deleteDoc(doc(db, "staffAnnouncements", id));
}

export async function setStaffAnnouncementPinned(id: string, pinned: boolean) {
  await updateDoc(doc(db, "staffAnnouncements", id), { pinned });
}

export async function updateStaffAnnouncement(
  id: string,
  fields: { title: string; body: string; pinned: boolean },
) {
  await updateDoc(doc(db, "staffAnnouncements", id), fields);
}

// 来場者アプリの「お知らせ」向け。企画担当者向け(staffAnnouncements)とは別コレクション。
export function subscribeVisitorAnnouncements(
  callback: (announcements: Announcement[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? "",
            body: data.body ?? "",
            pinned: !!data.pinned,
            createdAt: data.createdAt?.toMillis?.() ?? null,
          };
        }),
      );
    },
  );
}

export async function createVisitorAnnouncement(input: {
  title: string;
  body: string;
  pinned: boolean;
}) {
  await addDoc(collection(db, "announcements"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function updateVisitorAnnouncement(
  id: string,
  fields: { title: string; body: string; pinned: boolean },
) {
  await updateDoc(doc(db, "announcements", id), fields);
}

export async function deleteVisitorAnnouncement(id: string) {
  await deleteDoc(doc(db, "announcements", id));
}

export async function setVisitorAnnouncementPinned(id: string, pinned: boolean) {
  await updateDoc(doc(db, "announcements", id), { pinned });
}

export type VisitorRule = {
  id: string;
  heading: string;
  text: string;
  order: number;
};

// 来場者アプリの「来場者の皆さんへ」ページ向け。お知らせ(announcements)とは別コレクション。
export function subscribeVisitorRules(
  callback: (rules: VisitorRule[]) => void,
): () => void {
  return onSnapshot(collection(db, "visitorRules"), (snap) => {
    const rules = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        heading: data.heading ?? "",
        text: data.text ?? "",
        order: data.order ?? 0,
      } satisfies VisitorRule;
    });
    rules.sort((a, b) => a.order - b.order);
    callback(rules);
  });
}

export async function createVisitorRule(input: {
  heading: string;
  text: string;
  order: number;
}) {
  await addDoc(collection(db, "visitorRules"), input);
}

export async function updateVisitorRule(
  id: string,
  fields: { heading: string; text: string; order: number },
) {
  await updateDoc(doc(db, "visitorRules", id), fields);
}

export async function deleteVisitorRule(id: string) {
  await deleteDoc(doc(db, "visitorRules", id));
}

export type FestivalEvent = {
  id: string;
  day: string;
  order: number;
  name: string | null;
  startAt: string | null;
  endAt: string | null;
  venue: string | null;
  status: string;
};

// 運営ダッシュボード用。タイムテーブル(events)をリアルタイムで一覧購読する。
export function subscribeEvents(
  callback: (events: FestivalEvent[]) => void,
): () => void {
  return onSnapshot(collection(db, "events"), (snap) => {
    const events = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        day: data.day ?? "",
        order: data.order ?? 0,
        name: data.name ?? null,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        venue: data.venue ?? null,
        status: data.status ?? "scheduled",
      } satisfies FestivalEvent;
    });
    events.sort((a, b) => a.day.localeCompare(b.day) || a.order - b.order);
    callback(events);
  });
}

export async function updateEvent(
  id: string,
  fields: Partial<Pick<FestivalEvent, "name" | "startAt" | "endAt" | "venue" | "status">>,
) {
  await updateDoc(doc(db, "events", id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}
