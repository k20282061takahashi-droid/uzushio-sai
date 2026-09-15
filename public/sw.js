// 渦潮祭アプリ オフライン対応（Service Worker）
//
// これは何か
// ----------
// ブラウザの裏側で動く小さなプログラム。一度ひらいたページや画像を端末の中に
// しまっておき、通信がつながらない・遅いときに、しまってあるものをすぐ出す。
//
// なぜ必要か
// ----------
// 文化祭の当日は、同じ場所に数百人が集まって同じ電波を使う。体育館や中学棟の
// 奥では電波が届かないこともある。この仕組みが無いと、そのたびに画面が
// 真っ白のまま止まってしまう。
//
// どう動くか
// ----------
//   ページ（HTML）    … まず通信を試し、3秒で返事が無ければ保存版を出す
//   デザイン・部品     … 保存版を先に出す（中身が変わらないファイルのため）
//   校内図・画像       … 保存版を先に出しつつ、裏で新しいものに入れ替える
//   運営・企画担当の画面… 一切保存しない（常に最新でないと困るため）
//
// 更新のしかた
// ------------
// 中身を変えたら CACHE_VERSION の数字を1つ増やす。そうすると古い保存分が
// まとめて捨てられ、新しいものが入る。

const CACHE_VERSION = "v1";
const CACHE_NAME = `uzushio-${CACHE_VERSION}`;

// 最初に読み込んでおくページ。来場者がよく見る画面だけを入れている。
const PRECACHE_URLS = ["/", "/booths", "/map", "/timeline", "/stamp"];

// 保存してはいけない道すじ（運営・企画担当・ログインなど）
const NEVER_CACHE = ["/organizer", "/manage", "/reward", "/api/"];

// 通信をどれだけ待つか（ミリ秒）。これを過ぎたら保存版を出す。
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 1つでも失敗すると全部止まってしまうので、1つずつ入れて失敗は見逃す
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      // 新しい Service Worker をすぐ使えるようにする
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 古いバージョンの保存分を捨てる
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("uzushio-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      // すでに開いているページにもすぐ効かせる
      await self.clients.claim();
    })(),
  );
});

// 保存の対象外かどうかを判定する
function shouldSkip(request, url) {
  // 読み取り以外（送信・保存など）は触らない
  if (request.method !== "GET") return true;
  // ほかのサイト（Firestore・Googleなど）は触らない
  if (url.origin !== self.location.origin) return true;
  // 運営側の画面は常に最新でないと困る
  if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return true;
  // Next.js の開発中・内部用の道すじ
  if (url.pathname.startsWith("/_next/webpack")) return true;
  return false;
}

// 変わらないファイル（デザイン・部品）かどうか
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

// 画像などのファイルかどうか
function isMedia(url) {
  return /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname);
}

// 保存版を先に出す（無ければ通信する）
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

// 保存版をすぐ出しつつ、裏で新しいものに入れ替える
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await fetching) || Response.error();
}

// 開いている画面に「いま保存版を出した / 通信できた」を知らせる。
// 画面側（OfflineNotice）がこれを受け取って案内を出す。
async function notifyPages(type) {
  const pages = await self.clients.matchAll({ type: "window" });
  for (const page of pages) page.postMessage({ type });
}

// まず通信を試し、遅い・つながらないときは保存版を出す
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS),
  );

  try {
    const response = await Promise.race([fetch(request), timeout]);
    if (response && response.ok) {
      cache.put(request, response.clone());
      notifyPages("uzushio:online");
      return response;
    }
    if (response) return response;
  } catch {
    // 通信に失敗した。下の保存版で対応する。
  }

  const cached = await cache.match(request);
  if (cached) {
    notifyPages("uzushio:from-cache");
    return cached;
  }

  // 保存版も無い場合。ページの要求なら、せめてトップページを出す。
  if (request.mode === "navigate") {
    const home = await cache.match("/");
    if (home) {
      notifyPages("uzushio:from-cache");
      return home;
    }
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldSkip(request, url)) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isMedia(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ページ本体と、画面を切り替えるときのデータ
  event.respondWith(networkFirst(request));
});
