import { scrapeSpotify } from "../src/spotify.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return json({ status: false, message: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url) return json({ status: false, message: "Parameter url wajib diisi", example: "/api/spotify?url=https://open.spotify.com/track/xxxxx" }, 400);
    if (!url.includes("open.spotify.com") && !url.includes("spotify.link")) return json({ status: false, message: "URL Spotify tidak valid" }, 400);

    const result = await scrapeSpotify(url);
    return json({
      status: true,
      author: "ellreyxml",
      result: {
        title: result.title,
        duration: result.duration,
        thumbnail: result.thumbnail,
        download_url: result.download_url
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Spotify API Error:", error);
    return json({ status: false, author: "ellreyxml", message: error?.message || "Gagal memproses Spotify" }, 500);
  }
}
