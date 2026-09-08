import axios from "axios";

const BASE_URL = "https://am.yappi.my.id";

const COOKIE_API = `${BASE_URL}/api/cookie`;
const SEND_API = `${BASE_URL}/api/send`;
const VERIFY_API = `${BASE_URL}/api/verify`;

export async function getSessionCookie() {
    try {
        const res = await axios.get(COOKIE_API, {
            timeout: 10000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
            }
        });

        if (res.data?.ok && res.data?.cookie) {
            return res.data.cookie;
        }

        throw new Error("Gagal mendapatkan session cookie");
    } catch (err) {
        throw new Error(
            err.response?.data?.error ||
            err.message ||
            "Cookie API Error"
        );
    }
}

export async function sendVerificationLink(email, cookie) {
    try {
        const res = await axios.post(
            SEND_API,
            {
                email,
                cookie
            },
            {
                timeout: 30000,
                headers: {
                    "Content-Type": "application/json",
                    Origin: BASE_URL,
                    Referer: `${BASE_URL}/`,
                    "User-Agent":
                        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36"
                }
            }
        );

        if (!res.data?.ok) {
            throw new Error(
                res.data?.error || "Failed to send link"
            );
        }

        return res.data;

    } catch (err) {
        throw new Error(
            err.response?.data?.error ||
            err.message ||
            "Send verification failed"
        );
    }
}

export async function verifyMagicLink(email, link, cookie) {
    try {
        const res = await axios.post(
            VERIFY_API,
            {
                email,
                link,
                cookie
            },
            {
                timeout: 30000,
                headers: {
                    "Content-Type": "application/json",
                    Origin: BASE_URL,
                    Referer: `${BASE_URL}/`,
                    "User-Agent":
                        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36"
                }
            }
        );

        if (!res.data?.ok) {
            throw new Error(
                res.data?.error || "Verification failed"
            );
        }

        return res.data;

    } catch (err) {
        throw new Error(
            err.response?.data?.error ||
            err.message ||
            "Verification failed"
        );
    }
}