import axios from "axios";
import crypto from "crypto";
import fakeUserAgent from "fake-useragent";

class InstaVideoSave {
  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        Accept: "*/*",
        Origin: "https://fastvideosave.net",
        Referer: "https://fastvideosave.net/",
        "User-Agent": fakeUserAgent(),
      },
    });
  }

  encodeUrl(text) {
    const key = "qwertyuioplkjhgf";

    const cipher = crypto.createCipheriv(
      "aes-128-ecb",
      Buffer.from(key, "utf8"),
      null
    );

    cipher.setAutoPadding(true);

    return (
      cipher.update(text, "utf8", "hex") +
      cipher.final("hex")
    );
  }

  isInstagramUrl(value) {
    try {
      const parsed = new URL(value);

      return (
        parsed.protocol === "https:" &&
        (
          parsed.hostname === "instagram.com" ||
          parsed.hostname === "www.instagram.com"
        )
      );
    } catch {
      return false;
    }
  }

  async download({ url, link, target } = {}) {
    const targetUrl = url || link || target;

    if (!targetUrl) {
      throw {
        status: 400,
        message: "Parameter 'url', 'link', atau 'target' wajib diisi.",
      };
    }

    if (!this.isInstagramUrl(targetUrl)) {
      throw {
        status: 400,
        message: "URL yang dimasukkan bukan URL Instagram yang valid.",
      };
    }

    try {
      const encryptedUrl = this.encodeUrl(targetUrl);

      const { data } = await this.client.get(
        "https://api.videodropper.app/allinone",
        {
          headers: {
            Url: encryptedUrl,
          },
        }
      );

      return data;
    } catch (err) {
      const status =
        err?.response?.status ||
        err?.status ||
        500;

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Gagal mengambil data Instagram.";

      throw {
        status,
        message,
      };
    }
  }
}

export default InstaVideoSave;
export { InstaVideoSave };