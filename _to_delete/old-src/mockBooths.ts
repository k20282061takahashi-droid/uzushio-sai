// 動作確認用のダミー企画データ。
//
// ※ 本番ではFirestoreの booths コレクションに置き換えます（未対応）。
//   位置は座標ではなく「部屋名」で指定し、図面上の座標は
//   src/lib/floorplanRooms.json から自動で引きます。
//   これにより、本物の校内図に差し替えても部屋名が同じなら修正不要です。

import { roomCenter, type AreaId } from "./floorplan";

export type Booth = {
  id: string;
  name: string;
  category: string;
  description: string;
  area: AreaId;
  floor?: number; // senior / junior のみ
  room: string; // 図面上の部屋名（floorplanRooms.json の label と一致させる）
  waitMinutes: number;
};

// 地図に表示するときの、座標つきの形
export type PlacedBooth = Booth & { x: number; y: number };

export const booths: Booth[] = [
  // ---- 高校棟 4F ----
  { id: "s4-1", name: "3年A組 お化け屋敷", category: "アトラクション", description: "暗闇の中を進む脱出型お化け屋敷。所要時間約8分。", area: "senior", floor: 4, room: "3-A", waitMinutes: 28 },
  { id: "s4-2", name: "3年B組 カフェ", category: "飲食", description: "手作りスイーツとドリンクの喫茶店。", area: "senior", floor: 4, room: "3-B", waitMinutes: 12 },
  { id: "s4-3", name: "3年C組 脱出ゲーム", category: "アトラクション", description: "謎解き脱出ゲーム。1グループ最大6人。", area: "senior", floor: 4, room: "3-C", waitMinutes: 5 },
  { id: "s4-4", name: "3年D組 射的", category: "アトラクション", description: "コルクガンで的を狙うミニゲーム。", area: "senior", floor: 4, room: "3-D", waitMinutes: 0 },
  { id: "s4-5", name: "3年E組 写真展", category: "展示", description: "3年間の思い出を集めた写真展示。", area: "senior", floor: 4, room: "3-E", waitMinutes: 2 },
  { id: "s4-6", name: "映画研究部 上映会", category: "展示", description: "自主制作短編映画の上映。20分ごとの入れ替え制。", area: "senior", floor: 4, room: "多目的室", waitMinutes: 18 },

  // ---- 高校棟 3F ----
  { id: "s3-1", name: "2年A組 縁日", category: "アトラクション", description: "ヨーヨー釣り・輪投げなどの縁日コーナー。", area: "senior", floor: 3, room: "2-A", waitMinutes: 3 },
  { id: "s3-2", name: "2年B組 プラネタリウム", category: "アトラクション", description: "手作りドームでの星空上映。", area: "senior", floor: 3, room: "2-B", waitMinutes: 18 },
  { id: "s3-3", name: "2年C組 占い", category: "アトラクション", description: "タロット・手相占いコーナー。", area: "senior", floor: 3, room: "2-C", waitMinutes: 22 },
  { id: "s3-4", name: "2年D組 クレープ", category: "飲食", description: "その場で焼く手作りクレープ。", area: "senior", floor: 3, room: "2-D", waitMinutes: 9 },
  { id: "s3-5", name: "放送部 公開録音", category: "パフォーマンス", description: "校内ラジオの公開収録。飛び入り参加歓迎。", area: "senior", floor: 3, room: "視聴覚室", waitMinutes: 0 },

  // ---- 高校棟 2F ----
  { id: "s2-1", name: "1年A組 ダーツ", category: "アトラクション", description: "手作りダーツで景品を狙おう。", area: "senior", floor: 2, room: "1-A", waitMinutes: 4 },
  { id: "s2-2", name: "1年B組 手品ショー", category: "パフォーマンス", description: "30分ごとのミニ手品ショー。", area: "senior", floor: 2, room: "1-B", waitMinutes: 14 },
  { id: "s2-3", name: "図書委員会 古本市", category: "物販", description: "使わなくなった本の販売。1冊50円から。", area: "senior", floor: 2, room: "図書室", waitMinutes: 0 },

  // ---- 高校棟 1F ----
  { id: "s1-1", name: "受付・パンフレット配布", category: "案内", description: "パンフレットの配布と総合案内。", area: "senior", floor: 1, room: "昇降口", waitMinutes: 0 },
  { id: "s1-2", name: "運営本部", category: "案内", description: "落とし物・迷子・体調不良の対応はこちら。", area: "senior", floor: 1, room: "本部", waitMinutes: 0 },

  // ---- 中学棟 4F ----
  { id: "j4-1", name: "中3A組 巨大迷路", category: "アトラクション", description: "教室を使った巨大迷路。", area: "junior", floor: 4, room: "中3-A", waitMinutes: 9 },
  { id: "j4-2", name: "中3B組 わたあめ屋台", category: "飲食", description: "カラフルなわたあめを販売。", area: "junior", floor: 4, room: "中3-B", waitMinutes: 15 },
  { id: "j4-3", name: "科学部 実験ショー", category: "パフォーマンス", description: "液体窒素などを使った公開実験。", area: "junior", floor: 4, room: "理科室", waitMinutes: 6 },

  // ---- 中学棟 3F ----
  { id: "j3-1", name: "中2A組 ボードゲーム", category: "アトラクション", description: "自作ボードゲームで遊べるコーナー。", area: "junior", floor: 3, room: "中2-A", waitMinutes: 4 },
  { id: "j3-2", name: "吹奏楽部 ミニ演奏", category: "パフォーマンス", description: "少人数編成でのミニコンサート。", area: "junior", floor: 3, room: "音楽室", waitMinutes: 20 },

  // ---- 中学棟 2F ----
  { id: "j2-1", name: "中1A組 工作教室", category: "アトラクション", description: "小さいお子様向けの工作体験。", area: "junior", floor: 2, room: "中1-A", waitMinutes: 8 },
  { id: "j2-2", name: "美術部 作品展", category: "展示", description: "部員の絵画・立体作品の展示。", area: "junior", floor: 2, room: "美術室", waitMinutes: 1 },

  // ---- 体育館 ----
  { id: "gym-1", name: "ステージ企画", category: "パフォーマンス", description: "有志・部活動によるステージ発表。タイムテーブルを確認してください。", area: "gym", room: "ステージ", waitMinutes: 0 },
  { id: "gym-2", name: "PTA 休憩コーナー", category: "飲食", description: "お茶と軽食の販売。座って休めます。", area: "gym", room: "アリーナ右", waitMinutes: 3 },

  // ---- 校庭 ----
  { id: "yard-1", name: "有志企画 水風船割り", category: "アトラクション", description: "的当てで水風船を割るゲーム。", area: "schoolyard", room: "屋台エリアA", waitMinutes: 25 },
  { id: "yard-2", name: "PTA バザー", category: "物販", description: "手作りパン・軽食の販売。", area: "schoolyard", room: "屋台エリアB", waitMinutes: 6 },
  { id: "yard-3", name: "焼きそば屋台", category: "飲食", description: "同窓会による焼きそば販売。", area: "schoolyard", room: "屋台エリアC", waitMinutes: 17 },
];

// 指定したエリア・階の企画を、図面上の座標つきで返す。
// 部屋名が図面に存在しないものは表示できないので除外する。
export function boothsFor(area: AreaId, floor?: number): PlacedBooth[] {
  return booths
    .filter((b) => b.area === area && (floor === undefined || b.floor === floor))
    .map((b) => {
      const point = roomCenter(area, floor, b.room);
      return point ? { ...b, x: point.x, y: point.y } : null;
    })
    .filter((b): b is PlacedBooth => b !== null);
}
