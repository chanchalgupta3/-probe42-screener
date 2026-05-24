const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const PORT = process.env.PORT || 3000;

const HTML = fs.readFileSync(path.join(__dirname, "index.html"));

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  // Serve the main page
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
    return;
  }

  // Proxy endpoint
  if (req.method === "POST" && pathname === "/analyze") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const proxyReq = https.request(options, proxyRes => {
        let data = "";
        proxyRes.on("data", chunk => data += chunk);
        proxyRes.on("end", () => {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(data);
        });
      });

      proxyReq.on("error", err => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
