import axios from "axios";

const TARGET_URL = "https://am.neonode.my.id/api/verify-link";

const HEADERS = {
    "Content-Type": "application/json",
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36"
};

const CORS_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store"
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: CORS_HEADERS
    });
}

export default async function handler(req) {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: CORS_HEADERS
        });
    }

    try {
        const url = new URL(req.url);

        let email = url.searchParams.get("email");

        let magicLink =
            url.searchParams.get("link") ||
            url.searchParams.get("magicLink");

        // Support POST JSON
        if (req.method === "POST") {
            try {
                const body = await req.json();

                email = email || body?.email;

                magicLink =
                    magicLink ||
                    body?.magicLink ||
                    body?.link;
            } catch {}
        }

        // Validasi email
        if (!email || !String(email).includes("@")) {
            return json(
                {
                    author: "ellreyxml",
                    success: false,
                    message: "Email tidak valid."
                },
                400
            );
        }

        // Validasi magic link
        if (!magicLink) {
            return json(
                {
                    author: "ellreyxml",
                    success: false,
                    message: "Magic Link wajib diisi."
                },
                400
            );
        }

        email = String(email).trim();
        magicLink = String(magicLink).trim();

        // Request ke server asli
        const res = await axios.post(
            TARGET_URL,
            {
                email,
                magicLink
            },
            {
                headers: HEADERS,
                timeout: 30000,
                validateStatus: () => true
            }
        );

        // Server asli gagal
        if (res.status < 200 || res.status >= 300) {
            return json(
                {
                    author: "ellreyxml",
                    success: false,
                    message:
                        res.data?.message ||
                        "Verifikasi Magic Link gagal.",
                    email,
                    timestamp: new Date().toISOString()
                },
                res.status >= 400 && res.status <= 599
                    ? res.status
                    : 500
            );
        }

        /*
         * Server asli tidak memberikan response
         * member/premium yang bisa digunakan.
         *
         * Jadi response API kita dibuat sendiri
         * berdasarkan request verifikasi yang berhasil.
         */

        return json({
            author: "ellreyxml",
            success: true,
            message: "Verification successfully!",
            email,
            premium: true,
            membershipStatus: "PREMIUM_ACTIVE",
            plan: "1_year",
            expired: "1_year",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return json(
            {
                author: "ellreyxml",
                success: false,
                message: "Verifikasi Magic Link gagal.",
                error:
                    error.response?.data?.message ||
                    error.message ||
                    "Request gagal.",
                timestamp: new Date().toISOString()
            },
            500
        );
    }
}
