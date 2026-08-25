import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  "alumni" | "shop" | "class" | "grade" | "club" | "info" | "volunteer";

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

export type FestivalBuilding = {
  id: string;
  name: string;
  floors: number[];
};

export type FestivalVenue = {
  id: string;
  name: string;
  confirmed?: boolean;
};

export type FestivalMeta = {
  name: string;
  year: number;
  days: string[];
  buildings: FestivalBuilding[];
  venues: FestivalVenue[];
};

// 運営ダッシュボード用。会場・棟の一覧(meta/festival)を取得する。
export async function getFestivalMeta(): Promise<FestivalMeta | null> {
  const snap = await getDoc(doc(db, "meta", "festival"));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    name: data.name ?? "",
    year: data.year ?? 0,
    days: data.days ?? [],
    buildings: data.buildings ?? [],
    venues: data.venues ?? [],
  };
}

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
  // 校内図の部屋名（例: "3-A"）。地図にピンを置く位置を決めるのに使う。
  roomName: string | null;
  hasWaiting: boolean;
  waitingGroups: number | null;
  timePerGroup: number | null;
  genre: BoothGenre | null;
  isSetupDone: boolean;
  signboardUrl: string | null;
  // 待ちグループ数を最後に更新した時刻。長い間更新されていない企画を
  // 運営が見つけられるようにするために記録している。
  waitingUpdatedAt: number | null;
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
    roomName: data.roomName ?? null,
    hasWaiting: !!data.hasWaiting,
    waitingGroups: data.waitingGroups ?? null,
    timePerGroup: data.timePerGroup ?? null,
    genre: data.genre ?? null,
    isSetupDone: !!data.isSetupDone,
    signboardUrl: data.signboardUrl ?? null,
    waitingUpdatedAt: data.waitingUpdatedAt?.toMillis?.() ?? null,
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
        roomName: data.roomName ?? null,
        hasWaiting: !!data.hasWaiting,
        waitingGroups: data.waitingGroups ?? null,
        timePerGroup: data.timePerGroup ?? null,
        genre: data.genre ?? null,
        isSetupDone: !!data.isSetupDone,
        signboardUrl: data.signboardUrl ?? null,
        waitingUpdatedAt: data.waitingUpdatedAt?.toMillis?.() ?? null,
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
      | "hasWaiting"
      | "status"
      | "signboardUrl"
      | "projectName"
      | "location"
      | "floor"
      | "roomName"
      | "type"
      | "name"
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

// 文化祭の開催日（1日目・2日目）。settings/festival の days に
// ["2026-09-19", "2026-09-20"] の形で保存する。運営画面から設定できる。
// 来場者数を「1日目 / 2日目」に分けて数えるために使う。
export function subscribeFestivalDays(
  callback: (days: string[]) => void,
): () => void {
  return onSnapshot(doc(db, "settings", "festival"), (snap) => {
    const days = snap.data()?.days;
    callback(
      Array.isArray(days)
        ? days.filter((d): d is string => typeof d === "string")
        : [],
    );
  });
}

export async function setFestivalDays(days: string[]) {
  await setDoc(
    doc(db, "settings", "festival"),
    { days, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number | null;
  // 企画担当者向け連絡の宛先。null なら全企画あて。
  // 特定の企画にだけ送りたいときは、その企画のIDを並べる。
  targetBoothIds: string[] | null;
};

// 企画担当者向けの連絡。来場者アプリの「お知らせ」（announcementsコレクション）とは別物。
// boothId を渡すと、その企画あての連絡と全企画あての連絡だけに絞り込む。
export async function getStaffAnnouncements(
  boothId?: string,
): Promise<Announcement[]> {
  const snap = await getDocs(
    query(
      collection(db, "staffAnnouncements"),
      orderBy("createdAt", "desc"),
      limit(20),
    ),
  );
  const all = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      body: data.body ?? "",
      pinned: !!data.pinned,
      createdAt: data.createdAt?.toMillis?.() ?? null,
      targetBoothIds: Array.isArray(data.targetBoothIds)
        ? data.targetBoothIds
        : null,
    };
  });

  if (!boothId) return all;
  // 全企画あて（targetBoothIds が null）か、自分あてのものだけ残す
  return all.filter(
    (a) => a.targetBoothIds === null || a.targetBoothIds.includes(boothId),
  );
}

// 企画担当者向けの連絡をリアルタイムで購読する。
// 運営ダッシュボードは boothId なしで全件を、企画担当者ページは自分の boothId を
// 渡して「自分あて＋全企画あて」だけを受け取る。
// 運営が編集・削除した内容がその場で反映される（読み込み直し不要）。
export function subscribeStaffAnnouncements(
  callback: (announcements: Announcement[]) => void,
  boothId?: string,
): () => void {
  return onSnapshot(
    query(
      collection(db, "staffAnnouncements"),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    (snap) => {
      const all = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          body: data.body ?? "",
          pinned: !!data.pinned,
          createdAt: data.createdAt?.toMillis?.() ?? null,
          targetBoothIds: Array.isArray(data.targetBoothIds)
            ? data.targetBoothIds
            : null,
        };
      });

      if (!boothId) {
        callback(all);
        return;
      }
      // 全企画あて（targetBoothIds が null）か、自分あてのものだけ渡す
      callback(
        all.filter(
          (a) =>
            a.targetBoothIds === null || a.targetBoothIds.includes(boothId),
        ),
      );
    },
  );
}

export async function createStaffAnnouncement(input: {
  title: string;
  body: string;
  pinned: boolean;
  // 省略または null なら全企画あて
  targetBoothIds?: string[] | null;
}) {
  await addDoc(collection(db, "staffAnnouncements"), {
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    targetBoothIds: input.targetBoothIds ?? null,
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
    query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
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
            targetBoothIds: Array.isArray(data.targetBoothIds)
              ? data.targetBoothIds
              : null,
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
}): Promise<string> {
  const docRef = await addDoc(collection(db, "announcements"), {
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    targetBoothIds: null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
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

export async function setVisitorAnnouncementPinned(
  id: string,
  pinned: boolean,
) {
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
  // 開始が遅れたときに立つ印と、もともとの予定時刻
  delayed: boolean;
  originalStartAt: string | null;
  // 遅延を知らせるために自動で送ったお知らせのID。
  // 遅延を取り消すときに、このお知らせも一緒に消せるようにしている。
  delayAnnouncementId: string | null;
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
        delayed: !!data.delayed,
        originalStartAt: data.originalStartAt ?? null,
        delayAnnouncementId: data.delayAnnouncementId ?? null,
      } satisfies FestivalEvent;
    });
    events.sort((a, b) => a.day.localeCompare(b.day) || a.order - b.order);
    callback(events);
  });
}

export async function updateEvent(
  id: string,
  fields: Partial<
    Pick<FestivalEvent, "name" | "startAt" | "endAt" | "venue" | "status">
  >,
) {
  await updateDoc(doc(db, "events", id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

// ==================================================================
// 運営画面から企画・イベントを新しく作るための処理
// ==================================================================

// 企画ごとの管理用URLに使う、推測されにくい文字列を作る。
// 紛らわしい文字（0とO、1とlなど）は最初から除いてある。
const TOKEN_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateAccessToken(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
}

export type NewBoothInput = {
  name: string; // クラス名・団体名
  type: BoothType;
  location?: string | null;
  floor?: number | null;
  hasWaiting?: boolean;
};

// 企画を1件作る。管理用URLの文字列は自動で発行する。
export async function createBooth(input: NewBoothInput): Promise<string> {
  const docRef = await addDoc(collection(db, "booths"), {
    name: input.name,
    projectName: null,
    type: input.type,
    status: "open",
    accessToken: generateAccessToken(),
    description: "",
    location: input.location ?? null,
    floor: input.floor ?? null,
    roomName: null,
    hasWaiting: input.hasWaiting ?? false,
    waitingGroups: 0,
    timePerGroup: null,
    genre: null,
    isSetupDone: false,
    signboardUrl: null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 一覧をまとめて登録する。既にある名前は飛ばして二重登録を防ぐ。
export async function createBoothsBulk(
  inputs: NewBoothInput[],
  existingNames: string[],
): Promise<{ created: number; skipped: string[] }> {
  const known = new Set(existingNames);
  const skipped: string[] = [];
  let created = 0;

  for (const input of inputs) {
    if (known.has(input.name)) {
      skipped.push(input.name);
      continue;
    }
    await createBooth(input);
    known.add(input.name);
    created++;
  }
  return { created, skipped };
}

export async function deleteBooth(id: string) {
  await deleteDoc(doc(db, "booths", id));
}

// 待ちグループ数の更新。更新した時刻も一緒に記録する。
export async function updateWaitingGroups(id: string, waitingGroups: number) {
  await updateDoc(doc(db, "booths", id), {
    waitingGroups,
    waitingUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// イベント（ステージ発表など）を1件作る
export async function createEvent(input: {
  day: string;
  venue: string;
  name: string;
  startAt: string;
  endAt: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, "events"), {
    ...input,
    order: 0,
    status: "scheduled",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteEvent(id: string) {
  await deleteDoc(doc(db, "events", id));
}

// 「9:30」のような時刻を分に直す（遅れた分数を計算するために使う）
function timeToMinutes(text: string | null): number | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2})[:：](\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// 来場者に流す遅延のお知らせの文面を作る。
// 例）有志ダンスは開始時間が10分遅れて、10時40分から開始いたします
export function buildDelayMessage(
  eventName: string,
  originalStartAt: string | null,
  newStartAt: string,
): string {
  const before = timeToMinutes(originalStartAt);
  const after = timeToMinutes(newStartAt);
  const name = eventName || "イベント";

  const [hourText, minuteText] = newStartAt.split(/[:：]/);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const timeText = Number.isNaN(hour)
    ? newStartAt
    : `${hour}時${Number.isNaN(minute) || minute === 0 ? "" : `${minute}分`}`;

  if (before !== null && after !== null && after > before) {
    return `${name}は開始時間が${after - before}分遅れて、${timeText}から開始いたします`;
  }
  // 遅れた分数が計算できないときは、新しい開始時刻だけ伝える
  return `${name}は${timeText}から開始いたします`;
}

// イベントの開始を遅らせる。
// 予定時刻を書き換えたうえで、来場者アプリのお知らせにも自動で流す。
export async function delayEvent(
  event: FestivalEvent,
  newStartAt: string,
  newEndAt: string | null,
) {
  const message = buildDelayMessage(
    event.name ?? "",
    event.originalStartAt ?? event.startAt,
    newStartAt,
  );

  // すでに遅延のお知らせを出していれば、古いものは消してから出し直す
  if (event.delayAnnouncementId) {
    await deleteVisitorAnnouncement(event.delayAnnouncementId).catch(() => {});
  }

  const announcementId = await createVisitorAnnouncement({
    title: message,
    body: "",
    pinned: true,
  });

  await updateDoc(doc(db, "events", event.id), {
    startAt: newStartAt,
    endAt: newEndAt,
    delayed: true,
    // 何度遅らせても、もとの予定時刻は最初のものを残しておく
    originalStartAt: event.originalStartAt ?? event.startAt,
    delayAnnouncementId: announcementId,
    updatedAt: serverTimestamp(),
  });
}

// 遅延を取り消して、送ったお知らせも消す。もとの予定時刻に戻す。
export async function cancelEventDelay(event: FestivalEvent) {
  if (event.delayAnnouncementId) {
    await deleteVisitorAnnouncement(event.delayAnnouncementId).catch(() => {});
  }
  await updateDoc(doc(db, "events", event.id), {
    startAt: event.originalStartAt ?? event.startAt,
    delayed: false,
    originalStartAt: null,
    delayAnnouncementId: null,
    updatedAt: serverTimestamp(),
  });
}
