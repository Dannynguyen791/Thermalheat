const crypto = require("crypto");

const COOKIE_NAME = "thermal_access";

function getPassword() {
  return (process.env.WEB_PASSWORD || "thermal2026").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readBody(req) {
  if (typeof req.body === "string") {
    return Promise.resolve(req.body);
  }

  if (req.body && typeof req.body === "object") {
    return Promise.resolve(new URLSearchParams(req.body).toString());
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024) {
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(303, { Location: "/login" });
    res.end();
    return;
  }

  const body = await readBody(req);
  const submittedPassword = (new URLSearchParams(body).get("password") || "").trim();

  if (submittedPassword !== getPassword()) {
    res.writeHead(303, { Location: "/login?error=1" });
    res.end();
    return;
  }

  res.writeHead(303, {
    Location: "/",
    "Set-Cookie": `${COOKIE_NAME}=${sha256(getPassword())}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
  });
  res.end();
};
