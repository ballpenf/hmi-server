import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/routes/pages.ts 기준으로 ../data/pages 이 JSON 폴더
const pagesDir = path.resolve(__dirname, "../data/pages");

let DYNAMIC_PAGE_MAP: Record<string, string> = {};

/**
 * 서버 시작 시 'pagesDir'의 모든 JSON 파일을 스캔하여 맵을 생성합니다.
 */
// async function initializePageMap() {
//   try {
//     const files = await fs.readdir(pagesDir);
//     const map: Record<string, string> = {};

//     for (const fname of files) {
//       // .json 파일만 처리
//       if (fname.endsWith(".json")) {
//         // 'mainPage.json' -> 'main' 추출
//         const alias = fname.replace(/\.json$/, "");
//         map[alias] = fname;
//       }
//     }
//     DYNAMIC_PAGE_MAP = map;
//     console.log(
//       "[BACK] 동적 페이지 맵 생성 완료:",
//       Object.keys(DYNAMIC_PAGE_MAP)
//     );
//   } catch (e) {
//     console.error("[BACK] 페이지 맵 초기화 실패:", e);
//     // 오류가 발생해도 서버는 계속 실행되도록 함
//   }
// }

router.get(
  "/:alias/page",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alias = req.params.alias;

      // ⚠️ 보안: 상위 폴더 접근 방지 (../ 같은 문자 제거)
      const safeAlias = alias.replace(/(\.\.|\/|\\)/g, "");

      // 1. 파일 경로를 직접 구성
      const fileName = `${safeAlias}.json`;
      const filePath = path.join(pagesDir, fileName);

      // 2. 파일 존재 여부 확인 (fs.stat)
      try {
        await fs.access(filePath); // 파일이 없으면 에러 발생
      } catch (err) {
        return res.status(404).json({ ok: false, error: "Page not found" });
      }

      // 3. 파일 읽기 및 응답
      const text = await fs.readFile(filePath, "utf8");
      res.type("application/json").send(text);
    } catch (e) {
      next(e);
    }
  }
);

//void initializePageMap();

export default router;
