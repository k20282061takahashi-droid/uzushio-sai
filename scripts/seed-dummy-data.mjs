// 動作確認用のダミーデータを Firestore に登録するスクリプト。
//
// 【使い方】Macのターミナルで、このプロジェクトのフォルダに移動して実行してください。
//
//   cd ~/Documents/GitHub/uzushio-sai
//   npm install --no-save firebase-admin
//   node scripts/seed-dummy-data.mjs ~/Downloads/uzushiosai-firebase-adminsdk-〇〇.json
//
// 最後の引数は、Firebaseの管理者用の鍵ファイル（Downloadsフォルダにあるもの）です。
// ファイル名は環境によって違うので、実際のファイル名に置き換えてください。
//
// 【消したいとき】
//   node scripts/seed-dummy-data.mjs <鍵ファイル> --clear
// で、このスクリプトが入れたダミーだけを消せます（seeded: true が目印）。

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const keyPath = process.argv[2];
const shouldClear = process.argv.includes("--clear");

if (!keyPath) {
  console.error(
    "鍵ファイルのパスを指定してください。\n" +
      "例: node scripts/seed-dummy-data.mjs ~/Downloads/uzushiosai-firebase-adminsdk-xxxx.json",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ------------------------------------------------------------------
// 来場者の皆さんへ（校内ルール・注意事項）
// ------------------------------------------------------------------
const visitorRules = [
  {
    heading: "受付とパンフレットについて",
    text: `ご来場ありがとうございます。まず高校棟1階の昇降口にある受付にお立ち寄りください。
受付でパンフレットと来場者証をお渡しします。来場者証は校内にいる間、見えるところに付けてください。
再入場も自由です。その際も来場者証をご提示ください。`,
    order: 1,
  },
  {
    heading: "校内は全面禁煙です",
    text: `敷地内はすべて禁煙です。加熱式たばこ・電子たばこも同様に禁止しています。
喫煙をご希望の場合は、一度校外に出ていただきますようお願いします。`,
    order: 2,
  },
  {
    heading: "飲食できる場所",
    text: `購入した食べ物・飲み物は、校庭の休憩スペース、体育館のアリーナ後方、各階の廊下に用意したテーブル席でお召し上がりください。
教室内での飲食は、展示物を汚してしまうおそれがあるためご遠慮ください。
ゴミは各所のゴミ箱で分別して捨ててください。持ち帰りのご協力もお願いします。`,
    order: 3,
  },
  {
    heading: "写真・動画の撮影について",
    text: `思い出の記録として、撮影は自由に行っていただけます。
ただし、他の来場者や生徒が写り込む場合は、必ずご本人の許可を取ってください。
また、撮影した写真や動画をインターネットに公開する際は、写っている方全員の同意をお願いします。
一部の展示では撮影をお断りしている場合があります。掲示に従ってください。`,
    order: 4,
  },
  {
    heading: "小さなお子様をお連れの方へ",
    text: `校内は階段が多く、当日は大変混雑します。お子様から目を離さないようお願いします。
迷子のお子様をお預かりした場合は、高校棟1階の運営本部でお預かりします。
ベビーカーは昇降口横のスペースに置いていただけます。おむつ替えは保健室をご利用ください。`,
    order: 5,
  },
  {
    heading: "土足のままお入りいただけます",
    text: `今年度から、来場者の皆さまは上履きに履き替えずそのままお入りいただけます。
雨天時は入口に傘袋をご用意しますので、ご利用ください。`,
    order: 6,
  },
  {
    heading: "駐車場・駐輪場について",
    text: `校内および周辺に来場者用の駐車場はご用意しておりません。公共交通機関でお越しください。
近隣のコインパーキングや路上での駐車は、近隣の皆さまのご迷惑になりますのでお控えください。
自転車でお越しの方は、校庭東側の駐輪場をご利用ください。`,
    order: 7,
  },
  {
    heading: "貴重品の管理にご注意ください",
    text: `校内での紛失・盗難について、学校は責任を負いかねます。
お財布やスマートフォンなどの貴重品は、必ずご自身で管理してください。
落とし物をお預かりした場合は、このアプリの「落とし物」から確認できます。
お心当たりのある方は運営本部までお越しください。`,
    order: 8,
  },
  {
    heading: "体調が悪くなったときは",
    text: `気分が悪くなった方は、無理をせず近くの生徒か、高校棟1階の保健室・運営本部にお声がけください。
当日は気温が高くなることが予想されます。こまめな水分補給をお願いします。
校庭の休憩スペースに給水コーナーをご用意しています。`,
    order: 9,
  },
  {
    heading: "混雑時のお願い",
    text: `人気の企画では入場制限を行う場合があります。待ち時間はこのアプリのマップから確認できます。
階段は右側通行にご協力ください。廊下での立ち止まりはお控えください。
緊急時は生徒・教員の指示に従って避難してください。`,
    order: 10,
  },
];

// ------------------------------------------------------------------
// 落とし物（写真は public/dummy/ に置いたイラストを使っています）
// ------------------------------------------------------------------
const lostItems = [
  {
    description: "水色の水筒（500mlくらい）",
    foundLocation: "高校棟 4階 廊下",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-bottle.svg",
    boothName: "3年A組",
  },
  {
    description: "赤い折りたたみ傘",
    foundLocation: "体育館 入口",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-umbrella.svg",
    boothName: "運営本部",
  },
  {
    description: "茶色の二つ折り財布",
    foundLocation: "校庭 屋台エリアA付近",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-wallet.svg",
    boothName: "PTA バザー",
  },
  {
    description: "黒縁のメガネ（ケースなし）",
    foundLocation: "中学棟 3階 音楽室前",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-glasses.svg",
    boothName: "吹奏楽部",
  },
  {
    description: "グレーのパーカー（Mサイズ）",
    foundLocation: "高校棟 3階 2-B教室",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-jacket.svg",
    boothName: "2年B組",
  },
  {
    description: "鍵（キーホルダー付き）",
    foundLocation: "高校棟 1階 昇降口",
    storageLocation: "運営本部（高校棟1階）",
    photoUrl: "/dummy/lost-key.svg",
    boothName: "受付",
  },
];

// ------------------------------------------------------------------
// 来場者向けお知らせ（ピン留めの動作確認用に2件ピン留めしています）
// ------------------------------------------------------------------
const announcements = [
  {
    title: "本部で温かいお茶を配布しています",
    body: "高校棟1階の運営本部で、来場者の皆さまに温かいお茶を無料でお配りしています。ご自由にお立ち寄りください。",
    pinned: true,
  },
  {
    title: "落とし物のお預かりは運営本部までお願いします",
    body: "校内で落とし物を見つけた方は、高校棟1階の運営本部までお持ちください。お預かりしたものはこのアプリの「落とし物」からご確認いただけます。",
    pinned: true,
  },
  {
    title: "3年A組「お化け屋敷」は現在30分待ちです",
    body: "大変混み合っております。待ち時間はマップからいつでもご確認いただけます。",
    pinned: false,
  },
  {
    title: "体育館のステージ発表が10時から始まります",
    body: "吹奏楽部の演奏会は9時50分までです。10時からは有志ダンスが始まります。",
    pinned: false,
  },
  {
    title: "校庭の屋台は11時から営業開始です",
    body: "焼きそば・わたあめ・パンなどを販売しています。数に限りがありますのでお早めにどうぞ。",
    pinned: false,
  },
];

// ------------------------------------------------------------------

async function clearSeeded(collectionName) {
  const snap = await db.collection(collectionName).where("seeded", "==", true).get();
  let n = 0;
  for (const d of snap.docs) {
    await d.ref.delete();
    n++;
  }
  console.log(`  ${collectionName}: ダミー ${n}件を削除`);
}

async function main() {
  if (shouldClear) {
    console.log("ダミーデータを削除します...");
    await clearSeeded("visitorRules");
    await clearSeeded("lostItems");
    await clearSeeded("announcements");
    console.log("完了しました。");
    return;
  }

  console.log("ダミーデータを登録します...");

  // いったん過去のダミーを消してから入れ直す（何度実行しても増えないように）
  await clearSeeded("visitorRules");
  await clearSeeded("lostItems");
  await clearSeeded("announcements");

  for (const rule of visitorRules) {
    await db.collection("visitorRules").add({ ...rule, seeded: true });
  }
  console.log(`  visitorRules: ${visitorRules.length}件を登録`);

  for (const item of lostItems) {
    await db.collection("lostItems").add({
      ...item,
      boothId: "",
      status: "unclaimed",
      createdAt: FieldValue.serverTimestamp(),
      seeded: true,
    });
  }
  console.log(`  lostItems: ${lostItems.length}件を登録`);

  // 新しい順に並ぶよう、配列の後ろから順に登録して時刻をずらす
  for (let i = announcements.length - 1; i >= 0; i--) {
    await db.collection("announcements").add({
      ...announcements[i],
      createdAt: FieldValue.serverTimestamp(),
      seeded: true,
    });
  }
  console.log(`  announcements: ${announcements.length}件を登録`);

  console.log("完了しました。アプリを再読み込みして確認してください。");
}

main().catch((e) => {
  console.error("失敗しました:", e.message);
  process.exit(1);
});
