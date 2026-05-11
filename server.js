const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const preferredPort = Number(process.env.PORT) || 8080;
const password = process.env.WEB_PASSWORD || "thermal2026";
const sessionCookie = `thermal_access=${Buffer.from(password).toString("base64")}`;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function readBody(req, callback) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;

    if (body.length > 1024) {
      req.destroy();
    }
  });

  req.on("end", () => callback(body));
}

function isAuthorized(req) {
  return (req.headers.cookie || "").split(";").some((item) => item.trim() === sessionCookie);
}

function sendLogin(res, hasError = false) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dang nhap Thermal Pro</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #020408; color: #e2e8f0; font-family: Arial, sans-serif; }
    form { width: min(360px, calc(100vw - 32px)); padding: 24px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 18px; color: #94a3b8; font-size: 14px; }
    label { display: block; margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    input { box-sizing: border-box; width: 100%; height: 42px; padding: 0 12px; color: #e2e8f0; background: #0f172a; border: 1px solid #334155; border-radius: 6px; }
    button { width: 100%; height: 42px; margin-top: 14px; border: 0; border-radius: 6px; background: #38bdf8; color: #020408; font-weight: 700; cursor: pointer; }
    .error { margin-top: 12px; color: #fb7185; font-size: 13px; }
  </style>
</head>
<body>
  <form method="POST" action="/login">
    <h1>Thermal Pro</h1>
    <p>Nhap mat khau de truy cap mo phong.</p>
    <label for="password">Mat khau</label>
    <input id="password" name="password" type="password" autofocus required>
    <button type="submit">Mo web</button>
    ${hasError ? '<div class="error">Mat khau khong dung.</div>' : ""}
  </form>
</body>
</html>`);
}

function handleLogin(req, res) {
  readBody(req, (body) => {
    const submitted = new URLSearchParams(body).get("password") || "";

    if (submitted === password) {
      res.writeHead(303, {
        "Location": "/",
        "Set-Cookie": `${sessionCookie}; HttpOnly; SameSite=Strict; Path=/`,
      });
      res.end();
      return;
    }

    sendLogin(res, true);
  });
}

function sendFile(req, res) {
  if (req.url.startsWith("/login") && req.method === "POST") {
    handleLogin(req, res);
    return;
  }

  if (!isAuthorized(req)) {
    sendLogin(res);
    return;
  }

  let urlPath;

  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (urlPath === "/") {
    urlPath = "/Untitled-1.html";
  }

  const filePath = path.resolve(root, `.${urlPath}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

function listen(port) {
  const server = http.createServer(sendFile);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Open http://${host}:${port}/`);
  });
}

listen(preferredPort);
