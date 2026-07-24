import {
  collection,
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
    };
  });
}
