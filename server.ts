import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const GOOGLE_SHEETS_WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;

  // API routes
  app.post("/api/save-review", async (req, res) => {
    if (!GOOGLE_SHEETS_WEBAPP_URL) {
      return res.status(500).json({ error: "GOOGLE_SHEETS_WEBAPP_URL이 설정되지 않았습니다." });
    }

    try {
      const response = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();
      res.status(response.status).send(text);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : "Unknown error");
    }
  });

  app.get("/api/list-reviews", async (req, res) => {
    if (!GOOGLE_SHEETS_WEBAPP_URL) {
      return res.status(500).json({ error: "GOOGLE_SHEETS_WEBAPP_URL이 설정되지 않았습니다." });
    }

    try {
      const response = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}?mode=list`);
      const text = await response.text();
      res.status(200).send(text);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : "Unknown error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
