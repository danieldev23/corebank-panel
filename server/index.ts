/**
 * MB Bank Tool - Backend Server
 */

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import apiRoutes from "./routes/api";
import { warmup } from "./services/wasm-engine";
import { warmupOCR } from "./services/captcha-ocr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 2001;
const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/api", apiRoutes);

// ─── Static Frontend ────────────────────────────────────────────────────────

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// Fallback for Vue Router (SPA)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    res.status(404).json({ success: false, message: "API endpoint not found" });
    return;
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🏦 MBBank Panel PRO Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api\n`);

  // Pre-download WASM binary & OCR model
  try {
    await warmup();
    console.log("🔐 WASM encryption engine ready");
    await warmupOCR();
    console.log("🤖 OCR captcha model ready\n");
  } catch (err) {
    console.warn("⚠️  Warmup failed (will retry on first request):", err);
  }
});
