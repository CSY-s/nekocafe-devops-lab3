const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 8080);
const publicDir = path.join(__dirname, "public");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function resolveFile(urlPath) {
  const cleanPath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(publicDir, requested);
  if (!filePath.startsWith(publicDir)) {
    return path.join(publicDir, "index.html");
  }
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(publicDir, "index.html");
}

function serve(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const filePath = resolveFile(url.pathname);
  const ext = path.extname(filePath);
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentTypes.get(ext) || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

http.createServer(serve).listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ service: "frontend", event: "startup", port }));
});
