import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://spotidown.app";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36";


// ==========================================
// GET SESSION
// ==========================================

async function getSession() {
  const response = await axios.get(
    `${BASE_URL}/en3`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9"
      },
      timeout: 30000
    }
  );

  const cookies =
    response.headers["set-cookie"] || [];

  const sessionCookie = cookies
    .map(v => v.split(";")[0])
    .join("; ");

  const $ = cheerio.load(response.data);

  const form =
    $('form[name="spotifyurl"]');

  let dynamicName = "";
  let dynamicValue = "";

  form
    .find('input[type="hidden"]')
    .each((_, el) => {
      const name = $(el).attr("name");
      const value = $(el).attr("value");

      if (
        name &&
        name !== "g-recaptcha-response"
      ) {
        dynamicName = name;
        dynamicValue = value || "";
      }
    });

  return {
    sessionCookie,
    dynamicName,
    dynamicValue
  };
}


// ==========================================
// SEARCH SPOTIFY
// ==========================================

async function searchSpotify(url) {
  const {
    sessionCookie,
    dynamicName,
    dynamicValue
  } = await getSession();

  const payload = {
    url,
    "g-recaptcha-response": ""
  };

  if (dynamicName) {
    payload[dynamicName] =
      dynamicValue;
  }

  const response = await axios.post(
    `${BASE_URL}/action`,
    new URLSearchParams(payload).toString(),
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/en3`,
        "X-Requested-With":
          "XMLHttpRequest",
        Cookie: sessionCookie
      },
      timeout: 30000
    }
  );

  if (response.data?.error) {
    throw new Error(
      response.data?.message ||
      "Gagal memproses Spotify"
    );
  }

  const html =
    response.data?.data;

  if (!html) {
    throw new Error(
      "Response Spotidown kosong"
    );
  }

  const $ = cheerio.load(html);

  const tracks = [];

  $('form[name="submitspurl"]')
    .each((_, form) => {

      const data =
        $(form)
          .find('input[name="data"]')
          .val();

      const base =
        $(form)
          .find('input[name="base"]')
          .val();

      const token =
        $(form)
          .find('input[name="token"]')
          .val();

      if (
        !data ||
        !base ||
        !token
      ) {
        return;
      }

      let metadata = {};

      try {
        metadata =
          JSON.parse(
            Buffer
              .from(data, "base64")
              .toString("utf8")
          );
      } catch {
        console.log(
          "Metadata Spotify gagal diparse"
        );
      }

      tracks.push({
        metadata,

        form: {
          data,
          base,
          token
        }
      });
    });

  return {
    sessionCookie,
    tracks
  };
}


// ==========================================
// GET DOWNLOAD LINK
// ==========================================

async function getDownloadLink(
  form,
  sessionCookie
) {
  const response = await axios.post(
    `${BASE_URL}/action/track`,
    new URLSearchParams(form).toString(),
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/en3`,
        "X-Requested-With":
          "XMLHttpRequest",
        Cookie: sessionCookie
      },
      timeout: 30000
    }
  );

  if (response.data?.error) {
    throw new Error(
      response.data?.message ||
      "Gagal mendapatkan link download"
    );
  }

  const html =
    response.data?.data;

  if (!html) {
    throw new Error(
      "Response download kosong"
    );
  }

  const $ = cheerio.load(html);

  let mp3 = null;
  let cover = null;

  $("a").each((_, el) => {
    const href = $(el).attr("href");

    const text =
      $(el)
        .text()
        .trim()
        .toLowerCase();

    if (!href) return;

    if (
      text.includes("download mp3")
    ) {
      mp3 = href;
    }

    if (
      text.includes("download cover")
    ) {
      cover = href;
    }
  });

  return {
    mp3,
    cover
  };
}


// ==========================================
// MAIN SPOTIFY SCRAPER
// ==========================================

export async function scrapeSpotify(url) {
  const {
    sessionCookie,
    tracks
  } = await searchSpotify(url);

  if (!tracks.length) {
    throw new Error(
      "Lagu tidak ditemukan"
    );
  }

  const track = tracks[0];

  const links =
    await getDownloadLink(
      track.form,
      sessionCookie
    );

  if (!links.mp3) {
    throw new Error(
      "Link MP3 tidak ditemukan"
    );
  }

  const metadata =
    track.metadata || {};

  let duration =
    metadata.duration || null;

  if (
    !duration &&
    metadata.duration_ms
  ) {
    const totalSeconds =
      Math.floor(
        Number(
          metadata.duration_ms
        ) / 1000
      );

    const minutes =
      Math.floor(
        totalSeconds / 60
      );

    const seconds =
      totalSeconds % 60;

    duration =
      `${minutes}:${String(
        seconds
      ).padStart(2, "0")}`;
  }

  return {
    title:
      metadata.name ||
      "Unknown",

    duration:
      duration ||
      "Unknown",

    thumbnail:
      links.cover ||
      null,

    download_url:
      links.mp3
  };
}