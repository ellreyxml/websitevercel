import axios from "axios";

const BASE_URL = "https://satriam.satriadeveloperz.workers.dev";
const API_KEY = "am-rey";

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
    "Accept-Language":
        "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": `${BASE_URL}/`
};

const CORS = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-API-Key",
    "Cache-Control": "no-store"
};

function json(data, status = 200) {
    return new Response(
        JSON.stringify(
            {
                author: "ellreyxml",
                ...data
            },
            null,
            2
        ),
        {
            status,
            headers: CORS
        }
    );
}

export default async function handler(req) {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: CORS
        });
    }

    try {
        const url = new URL(req.url);

        const apikey =
            url.searchParams.get("apikey") ||
            req.headers.get("x-api-key") ||
            req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

        if (apikey !== API_KEY) {
            return json(
                {
                    success: false,
                    message: "API key tidak valid atau tidak ditemukan."
                },
                401
            );
        }

        let email = url.searchParams.get("email");

        if (!email && req.method === "POST") {
            try {
                const body = await req.json();
                email = body?.email;
            } catch {}
        }

        if (!email) {
            return json(
                {
                    success: false,
                    message: "Parameter email wajib diisi.",
                    usage: {
                        endpoint: "/alight-motion/send",
                        method: "GET",
                        example:
                            "/alight-motion/send?apikey=am-rey&email=email@gmail.com"
                    },
                    timestamp: new Date().toISOString()
                },
                400
            );
        }

        email = String(email).trim();

        if (!email.includes("@")) {
            return json(
                {
                    success: false,
                    message: "Format email tidak valid.",
                    email,
                    timestamp: new Date().toISOString()
                },
                400
            );
        }

        const res = await axios.post(
            `${BASE_URL}/api/satriam/send-link`,
            { email },
            {
                headers: HEADERS,
                timeout: 15000
            }
        );

        if (!res.data?.success) {
            return json(
                {
                    success: false,
                    message: "Gagal mengirim Magic Link.",
                    email,
                    data: res.data,
                    timestamp: new Date().toISOString()
                },
                400
            );
        }

        return json({
            success: true,
            message:
                res.data?.message ||
                "Magic Link berhasil dikirim.",
            email,
            data: res.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return json(
            {
                success: false,
                message: "Gagal mengirim Magic Link.",
                error: error?.message || String(error),
                timestamp: new Date().toISOString()
            },
            500
        );
    }
}
