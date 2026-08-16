import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "artifacts/lotto-app/public/lotto-news/stores");
const manifestPath = path.join(root, "artifacts/lotto-app/public/lotto-famous-stores.json");
const syncPath = path.join(root, "artifacts/lotto-app/public/lotto-stores-sync.json");

const STORE_SOURCES = [
  {
    id: "서울|노원구|주공10단지종합상가111",
    slug: "spa-nowon",
    pages: ["https://jj109.tistory.com/24", "https://lottoyeojido.tistory.com/entry/%EC%8A%A4%ED%8C%8C-%EC%84%9C%EC%9A%B8-%EB%85%B8%EC%9B%90%EA%B5%AC-%E2%80%94-24%EB%85%84-%EB%88%84%EC%A0%81-%EB%AA%85%EB%8B%B9-%EB%B6%84%EC%84%9D"],
  },
  {
    id: "부산|동구|부산동구범일동830-195",
    slug: "buil-busan-beomil",
    pages: [
      "https://hititler.tistory.com/2896",
      "https://lyntour.com/posts/busan-lotto-lucky-spot-buil-car-service",
      "https://photoguide.com/520",
    ],
  },
  {
    id: "부산|동구|부산동구자성로133",
    slug: "buil-busan-jaseong",
    pages: [
      "https://hititler.tistory.com/2896",
      "https://lyntour.com/posts/busan-lotto-lucky-spot-buil-car-service",
      "https://photoguide.com/520",
      "https://lottis.kr/stores/824",
    ],
  },
  {
    id: "충남|아산시|충남아산시서해로519",
    slug: "injoo-asan-main",
    pages: ["https://ricco.tistory.com/82", "https://ddgd19.tistory.com/378"],
  },
  {
    id: "raw:충남아산시인주면신성리188-8",
    slug: "injoo-asan-branch",
    pages: ["https://ddgd19.tistory.com/378", "https://ricco.tistory.com/82"],
  },
  {
    id: "서울|종로구|서울종로구종로5",
    slug: "jay-jongno",
    pages: ["https://losetto.tistory.com/176", "https://place.udanax.org/p/4316102/%EC%A0%9C%EC%9D%B4%EB%B3%B5%EA%B6%8C%EB%B0%A9"],
  },
  {
    id: "대구|달서구|대구달서구본리동2-161",
    slug: "first-convenience-daegu",
    pages: [
      "https://lottoyeojido.tistory.com/entry/%EC%9D%BC%EB%93%B1%EB%B3%B5%EA%B6%8C%ED%8E%B8%EC%9D%98%EC%A0%90-%EB%8C%80%EA%B5%AC-%EB%8B%AC%EC%84%9C%EA%B5%AC-%E2%80%94-24%EB%85%84-%EB%88%84%EC%A0%81-%EB%AA%85%EB%8B%B9-%EB%B6%84%EC%84%9D",
      "https://lotto.agptedu.com/dalseogu-lotto-il-deung-bokgwon/",
    ],
  },
  {
    id: "부산|기장군|부산기장군정관중앙로48106",
    slug: "newbigmart",
    pages: ["https://garlicnoodle.tistory.com/412", "https://lottis.kr/stores/1761", "https://lotto.agptedu.com/busan-lotto-hotspots-top10/"],
  },
  {
    id: "대구|서구|대구서구평리동1094-4",
    slug: "sejin-daegu",
    pages: ["https://ememe.tistory.com/37", "https://ddongsimbo.tistory.com/247", "https://lotto.agptedu.com/daegu-seogu-lotto-hotspot-top10/", "https://lottis.kr/stores/960"],
  },
  {
    id: "광주|서구|광주서구상무대로1087",
    slug: "ocheoneok-gwangju",
    pages: ["https://lotto.agptedu.com/gwangju-seogu-lotto/", "https://cielsoft.kr/lotto/ochernerkbokgwombang-si12900033-store-information.html"],
  },
  {
    id: "울산|남구|삼성아파트상가204",
    slug: "yeonghwa-ulsan",
    pages: ["https://lottis.kr/stores/1433", "https://lotto.agptedu.com/ulsan-lotto-hotspots-top10/", "https://losetto.tistory.com/230"],
  },
  {
    id: "경기|용인시기흥구용구|경기용인시기흥구용구대로1885",
    slug: "lotto-rest-yongin",
    pages: ["https://woct19.tistory.com/45", "https://imhere98.tistory.com/400", "https://issue.ddanddan100.com/entry/%EB%A1%9C%EB%98%90-%EB%AA%85%EB%8B%B9-%EB%B0%A9%EB%AC%B8%EA%B8%B0%EC%9A%A9%EC%9D%B8-%EB%A1%9C%EB%98%90%ED%9C%B4%EA%B2%8C%EC%8B%A4-1%EB%93%B1-26%EB%AA%85-%EB%B0%B0%EC%B6%9C"],
  },
  {
    id: "광주|광산구|광주광산구수등로2531",
    slug: "alibi-gwangju",
    pages: ["https://lotto.agptedu.com/lotto-gwangju-gwangsan-alibi/", "https://lottohell.com/winstores/54789/"],
  },
  {
    id: "서울|영등포구|서울영등포구영등포동4",
    slug: "bus-store-yeongdeungpo",
    pages: ["https://lotto.agptedu.com/yeongdeungpo-dong-3ga-lotto-top-4/", "https://losetto.tistory.com/447"],
  },
  {
    id: "서울|서초구|서울서초구신반포로176",
    slug: "ok-central-city",
    pages: ["https://comicrock.tistory.com/415", "https://lottis.kr/stores/62526"],
  },
];

const BAD_IMAGE_RE =
  /no-image|opengraph\.png|photoguide_tok|blank\.png|Image-Generation|favicon|sprite|emoji|avatar|banner-ad|spacer|1x1|pixel\.gif/i;

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractImageUrls(html) {
  const urls = new Set();
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<img[^>]+(?:data-)?src=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = decodeHtml(match[1]).trim();
      if (!raw || raw.startsWith("data:")) continue;
      if (/\.(svg|gif)(\?|$)/i.test(raw)) continue;
      if (BAD_IMAGE_RE.test(raw)) continue;
      urls.add(raw);
    }
  }

  return [...urls];
}

function expandImageCandidates(url, pageUrl) {
  const items = [{ url, score: scoreImage(url), pageUrl }];
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("daumcdn.net") && parsed.searchParams.has("fname")) {
      const decoded = decodeURIComponent(parsed.searchParams.get("fname"));
      const direct = new URL(decoded, pageUrl).href;
      items.push({ url: direct, score: scoreImage(direct) - 1, pageUrl });
    }
  } catch {
    // ignore
  }
  return items;
}

function scoreImage(url) {
  let score = 0;
  if (/img1\.daumcdn\.net\/thumb/i.test(url)) score += 9;
  if (/blog\.kakaocdn\.net\/dna/i.test(url)) score += 4;
  if (/tistory\.com\/cfile|t1\.daumcdn\.net\/cfile/i.test(url)) score += 7;
  if (/lotto_map\/store-/i.test(url)) score += 4;
  if (/lottis\.kr\/stores\/\d+\/opengraph-image/i.test(url)) score += 4;
  if (/tistory|blog|post|upload|image|photo|media|cdn|kakaocdn|daumcdn|naver|pstatic|lyntour|photoguide|agptedu/i.test(url)) {
    score += 2;
  }
  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) score += 3;
  if (/1200|1080|800|640|600|1280|1440|R800|R1280/.test(url)) score += 1;
  if (/thumb|small|icon|profile|-32x32|-180x180|-192x192|-270x270|-300x200/i.test(url)) score -= 4;
  if (BAD_IMAGE_RE.test(url)) score -= 10;
  return score;
}

async function collectCandidates(pageUrls) {
  const candidates = [];
  for (const pageUrl of pageUrls) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      for (const url of extractImageUrls(html)) {
        const absolute = new URL(url, pageUrl).href;
        for (const candidate of expandImageCandidates(absolute, pageUrl)) {
          candidates.push(candidate);
        }
      }
    } catch {
      // skip
    }
  }

  const seen = new Set();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      if (seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return candidate.score > 0;
    });
}

async function downloadImage(url, filePath) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      Referer: new URL(url).origin,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4_000) throw new Error("image too small");
  let ext = ".jpg";
  if (type.includes("png")) ext = ".png";
  else if (type.includes("webp")) ext = ".webp";
  const finalPath = filePath.replace(/\.[a-z]+$/i, ext);
  await fs.writeFile(finalPath, buf);
  return finalPath;
}

function findCoords(sync, store) {
  let best = null;
  for (const round of Object.values(sync.rounds ?? {})) {
    for (const candidate of [...(round.stores1 ?? []), ...(round.stores2 ?? [])]) {
      if (candidate.name !== store.name) continue;
      if (!candidate.lat || !candidate.lng) continue;
      if (candidate.address.includes(store.address.slice(0, 8)) || store.address.includes(candidate.address.slice(0, 8))) {
        best = { lat: candidate.lat, lng: candidate.lng };
      }
    }
  }
  return best;
}

async function loadExistingManifest() {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return { stores: {} };
  }
}

async function saveStoreImage(store, source, manifest) {
  const slug = source?.slug ?? store.id.replace(/[^\w가-힣-]+/g, "-").toLowerCase();
  const candidates = await collectCandidates(source?.pages ?? []);
  if (candidates.length === 0) {
    console.log("  no image found");
    return false;
  }

  for (const picked of candidates.slice(0, 8)) {
    try {
      const target = path.join(outDir, `${slug}.jpg`);
      const saved = await downloadImage(picked.url, target);
      const publicPath = `/lotto-news/stores/${path.basename(saved)}`;
      const coords = findCoords(
        JSON.parse(await fs.readFile(syncPath, "utf8")),
        store,
      );
      manifest.stores[store.id] = {
        image: publicPath,
        sourceUrl: picked.pageUrl,
        imageUrl: picked.url,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };
      console.log(`  saved ${publicPath}`);
      return true;
    } catch (error) {
      console.log(`  try failed (${picked.url.slice(0, 60)}…): ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("  download failed for all candidates");
  return false;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const stats = JSON.parse(await fs.readFile(path.join(root, "artifacts/lotto-app/public/store-win-stats.json"), "utf8"));
  const existing = await loadExistingManifest();

  const famous = Object.entries(stats.entries ?? {})
    .map(([id, entry]) => ({ id, ...entry }))
    .filter((entry) => entry.rank1 >= 10)
    .sort((a, b) => b.rank1 - a.rank1 || b.rank2 - a.rank2);

  const manifest = {
    updatedAt: new Date().toISOString(),
    stores: { ...(existing.stores ?? {}) },
  };

  for (const store of famous) {
    const source = STORE_SOURCES.find((item) => item.id === store.id);
    console.log(`\n[store] ${store.name} (${store.id})`);
    const saved = await saveStoreImage(store, source, manifest);
    if (!saved && manifest.stores[store.id]) {
      console.log(`  kept existing ${manifest.stores[store.id].image}`);
    }
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`\nWrote manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
