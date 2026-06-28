import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requestedPort = Number(process.env.PORT ?? process.argv[2] ?? 8000);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".wasm", "application/wasm"],
  [".data", "application/octet-stream"],
  [".wad", "application/octet-stream"]
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
  let filePath = resolve(repoRoot, cleanPath);

  if (!filePath.startsWith(repoRoot + sep) && filePath !== repoRoot) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(requestedPort, () => {
  console.log(`Serving ${repoRoot} at http://127.0.0.1:${requestedPort}/`);
});
