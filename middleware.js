import { next } from "@vercel/functions";

export const config = {
  matcher: ["/((?!api/|favicon.ico).*)"],
};

const COOKIE_NAME = "thermal_access";

function getPassword() {
  return (process.env.WEB_PASSWORD || "thermal2026").trim();
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCookie(request, name) {
  const cookies = request.headers.get("cookie") || "";

  return cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function loginPage(hasError = false) {
  return new Response(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dang nhap Thermal Pro</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #020408; color: #e2e8f0; font-family: Arial, sans-serif; }
    form { width: min(360px, calc(100vw - 32px)); padding: 24px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 18px; color: #94a3b8; font-size: 14px; }
    label { display: block; margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    input { box-sizing: border-box; width: 100%; height: 42px; padding: 0 12px; color: #e2e8f0; background: #0f172a; border: 1px solid #334155; border-radius: 6px; }
    button { width: 100%; height: 42px; margin-top: 14px; border: 0; border-radius: 6px; background: #38bdf8; color: #020408; font-weight: 700; cursor: pointer; }
    .error { margin-top: 12px; color: #fb7185; font-size: 13px; }
  </style>
</head>
<body>
  <form method="POST" action="/api/login">
    <h1>Thermal Pro</h1>
    <p>Nhap mat khau de truy cap mo phong.</p>
    <label for="password">Mat khau</label>
    <input id="password" name="password" type="password" autofocus required>
    <button type="submit">Mo web</button>
    ${hasError ? '<div class="error">Mat khau khong dung.</div>' : ""}
  </form>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname === "/login") {
    return loginPage(url.searchParams.get("error") === "1");
  }

  const expectedToken = await sha256(getPassword());

  if (getCookie(request, COOKIE_NAME) !== expectedToken) {
    return loginPage();
  }

  return next();
}
