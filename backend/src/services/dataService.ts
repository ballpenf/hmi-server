import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db/mariadb.js";
import type { TooltestVO } from "../vo/toolTestVO.js";
import SharedMemoryService from "./sharedMemoryService.js";

type RowOf<T> = T & RowDataPacket;
type TooltestRow = RowOf<TooltestVO>;

export async function getValues(
  ids: string[]
): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};

  // 1) (?, ?, ?, ...) 플레이스홀더 동적 생성
  const ph = ids.map(() => "?").join(",");

  // 2) 준비된 SQL에 바인딩
  const sql = `SELECT id, \`value\` FROM tooltest WHERE id IN (${ph})`;

  const [rows] = await pool.execute<TooltestRow[]>(sql, ids);

  // 3) 맵으로 변환
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.id] = r.value;

  // // 요청에는 있었지만 DB에는 없는 키를 null로 채우고 싶다면:
  // for (const id of ids) if (!(id in map)) map[id] = null;

  return map;
}

export async function setValues(
  updates: { id: string; value: unknown }[]
): Promise<void> {
  if (updates.length === 0) return;

  const sql = `UPDATE tooltest SET \`value\` = ? WHERE id = ?`;
  const promises = updates.map((u) =>
    pool.execute<ResultSetHeader>(sql, [u.value, u.id])
  );
  await Promise.all(promises);
}

// 공유메모리 서비스 인스턴스
const shm = new SharedMemoryService();

// 예시: 값 쓰기 (뷰어에서 바로 확인 가능)
//shm.set(1, "gp1_vab", 230.55);
//shm.set(2, "gp1_vbc", 229.87);

// 모든 변수 키 출력
//console.log("Keys:", shm.keys());

// 특정 변수의 오프셋 정보 확인
//console.log("gp1_vab info:", shm.info("1:gp1_vab"));

// 2초마다 읽어서 출력
// setInterval(() => {
//   const v = shm.get(1, "gp1_vab");
//   console.log(`[READ] gp1_vab = ${v}`);
//   const v1 = shm.get(7, "gp1_freq");
//   console.log(`[READ] gp1_freq = ${v1}`);
// }, 2000);
