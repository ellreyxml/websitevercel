/*
 * All-in-One Downloader API
 * Base: vidssave.com
 * Author: ellreyxml
 */

const AUTHOR = "ellreyxml";

class VidsSave {
  constructor() {
    this.baseUrl = "https://api.vidssave.com/api/contentsite_api";
    this.auth = "20250901majwlqo";
    this.domain = "api-ak.vidssave.com";
  }

  async download(url) {
    if (!url) {
      throw new Error("URL is required");
    }

    const payload = new URLSearchParams({
      auth: this.auth,
      domain: this.domain,
      origin: "source",
      link: url
    });

    const response = await fetch(
      `${this.baseUrl}/media/parse`,
      {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "id-ID,id;q=0.9,en;q=0.8",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          "origin": "https://vidssave.com",
          "pragma": "no-cache",
          "referer": "https://vidssave.com/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        body: payload.toString()
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid response from VidsSave (${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        `VidsSave HTTP ${response.status}`
      );
    }

    return data?.data ?? data;
  }
}

const api = new VidsSave();

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store"
      }
    }
  );
}

export default async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  // GET only
  if (req.method !== "GET") {
    return json(
      {
        status: false,
        author: AUTHOR,
        message: "Method not allowed"
      },
      405
    );
  }

  try {
    const requestUrl = new URL(req.url);

    const targetUrl =
      requestUrl.searchParams.get("url") ||
      requestUrl.searchParams.get("link");

    if (!targetUrl) {
      return json(
        {
          status: false,
          author: AUTHOR,
          message: "Parameter url is required",
          example: "/api/aio?url=https://www.tiktok.com/..."
        },
        400
      );
    }

    // Validasi URL
    let parsedUrl;

    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return json(
        {
          status: false,
          author: AUTHOR,
          message: "Invalid URL"
        },
        400
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return json(
        {
          status: false,
          author: AUTHOR,
          message: "Only HTTP/HTTPS URLs are supported"
        },
        400
      );
    }

    const result = await api.download(targetUrl);

    return json({
      status: true,
      author: AUTHOR,
      url: targetUrl,
      result
    });

  } catch (error) {
    console.error("AIO ERROR:", error);

    return json(
      {
        status: false,
        author: AUTHOR,
        message: error?.message || "Internal server error"
      },
      500
    );
  }
};