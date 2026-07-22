export type Booth = {
  id: string;
  name: string;
  category: string;
  description: string;
  area: "gym" | "senior" | "junior" | "schoolyard";
  floor?: number; // senior/juniorのみ
  x: number; // %
  y: number; // %
  waitMinutes: number;
};

export const booths: Booth[] = [
  // 高校棟 4F
  { id: "s4-1", name: "3年A組 お化け屋敷", category: "アトラクション", description: "暗闇の中を進む脱出型お化け屋敷。所要時間約8分。", area: "senior", floor: 4, x: 20, y: 25, waitMinutes: 28 },
  { id: "s4-2", name: "3年B組 カフェ", category: "飲食", description: "手作りスイーツとドリンクの喫茶店。", area: "senior", floor: 4, x: 60, y: 30, waitMinutes: 12 },
  { id: "s4-3", name: "3年C組 脱出ゲーム", category: "アトラクション", description: "謎解き脱出ゲーム。1グループ最大6人。", area: "senior", floor: 4, x: 40, y: 65, waitMinutes: 5 },
  { id: "s4-4", name: "3年D組 射的", category: "アトラクション", description: "コルクガンで的を狙うミニゲーム。", area: "senior", floor: 4, x: 78, y: 70, waitMinutes: 0 },
  // 高校棟 3F
  { id: "s3-1", name: "2年A組 縁日", category: "アトラクション", description: "ヨーヨー釣り・輪投げなどの縁日コーナー。", area: "senior", floor: 3, x: 25, y: 30, waitMinutes: 3 },
  { id: "s3-2", name: "2年B組 プラネタリウム", category: "アトラクション", description: "手作りドームでの星空上映。", area: "senior", floor: 3, x: 65, y: 40, waitMinutes: 18 },
  { id: "s3-3", name: "2年C組 占い", category: "アトラクション", description: "タロット・手相占いコーナー。", area: "senior", floor: 3, x: 45, y: 72, waitMinutes: 22 },
  // 中学棟 4F
  { id: "j4-1", name: "中3A組 迷路", category: "アトラクション", description: "教室を使った巨大迷路。", area: "junior", floor: 4, x: 30, y: 35, waitMinutes: 9 },
  { id: "j4-2", name: "中3B組 わたあめ屋台", category: "飲食", description: "カラフルなわたあめを販売。", area: "junior", floor: 4, x: 70, y: 55, waitMinutes: 15 },
  // 校庭
  { id: "yard-1", name: "有志企画 水風船割り", category: "アトラクション", description: "的当てで水風船を割るゲーム。", area: "schoolyard", x: 35, y: 40, waitMinutes: 25 },
  { id: "yard-2", name: "PTA バザー", category: "飲食", description: "手作りパン・軽食の販売。", area: "schoolyard", x: 65, y: 60, waitMinutes: 6 },
];

export function boothsFor(area: Booth["area"], floor?: number) {
  return booths.filter((b) => b.area === area && (floor === undefined || b.floor === floor));
}
