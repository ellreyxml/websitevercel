/*
 * Created by : febry.is-a.dev
 * GitHub     : vandebry10-star
 * Date       : 30-08-2026
 * Do not remove the creator's watermark, please respect the creator.
 */

import InstaVideoSave from "../src/InstaVideoSave.js";

const instaVideo = new InstaVideoSave();

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers,
    }
  );
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json(
      {
        status: false,
        error: "Method tidak diizinkan. Gunakan GET atau POST.",
      },
      405
    );
  }

  try {
    let params = {};

    if (request.method === "GET") {
      const requestUrl = new URL(request.url);

      params = {
        action: requestUrl.searchParams.get("action"),
        url: requestUrl.searchParams.get("url"),
        link: requestUrl.searchParams.get("link"),
        target: requestUrl.searchParams.get("target"),
      };
    } else {
      try {
        params = await request.json();
      } catch {
        return json(
          {
            status: false,
            error: "Body JSON tidak valid.",
          },
          400
        );
      }
    }

    const {
      action,
      url,
      link,
      target,
    } = params;

    const targetUrl = url || link || target;

    const availableActions = {
      igdl_actions: [
        "download"
      ],
    };

    if (!action && !targetUrl) {
      return json(
        {
          status: false,
          error: "Parameter 'url' atau 'action' wajib diisi.",
          available_actions: availableActions,
        },
        400
      );
    }

    if (action && action !== "download") {
      return json(
        {
          status: false,
          error: `Action '${action}' tidak tersedia.`,
          available_actions: availableActions,
        },
        400
      );
    }

    if (!targetUrl) {
      return json(
        {
          status: false,
          error: "URL Instagram wajib diisi.",
        },
        400
      );
    }

    const result = await instaVideo.download({
      url: targetUrl,
      link,
      target,
    });

    return json({
      status: true,
      result,
    });

  } catch (error) {
    console.error("IGDL ERROR:", error);

    return json(
      {
        status: false,
        error:
          error?.message ||
          "Terjadi kesalahan internal pada server.",
      },
      Number(error?.status) || 500
    );
  }
}