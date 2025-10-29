import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { assertDb, pool } from "./db/mariadb.js";
import mainRoute from "./routes/mainRoute.js";
import dataRoute from "./routes/dataRoute.js";
import pagesRoute from "./routes/pagesRoute.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", pagesRoute);
app.use("/api/data", dataRoute);
app.use("/api/main", mainRoute);

app.use((_req, res) => res.status(404).json({ error: "not found" }));

// 에러 핸들러(예시)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, async () => {
  console.log(`[backend] http://localhost:${PORT}`);
  try {
    await assertDb(); // ← 기동 시 1회 DB 확인
  } catch (e) {
    console.error("❌ DB 연결 실패:", e);
  }
});
