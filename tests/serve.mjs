// Tiny static server for the harnesses. No dependency on anything the app ships.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"
};

export function serve(root = process.cwd()) {
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      let path = decodeURIComponent(req.url.split("?")[0]);
      if (path === "/") path = "/index.html";
      const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ url: "http://127.0.0.1:" + port, close: () => {
        // Keep-alive sockets from a closed browser would otherwise hold the
        // process open after the harness is done.
        if (server.closeAllConnections) server.closeAllConnections();
        server.close();
      } });
    });
  });
}

export const ROUTES = [
  { hash: "#/crawls", name: "Crawls" },
  { hash: "#/log", name: "Roll log" },
  { hash: "#/log/distribution", name: "Distribution" },
  { hash: "#/rules", name: "Rules" },
  { hash: "#/learn/tutorial", name: "Tutorial" },
  { hash: "#/settings", name: "Settings" },
  { hash: "#/room", name: "Room (contextual)" }
];
