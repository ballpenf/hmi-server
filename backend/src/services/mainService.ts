import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db/mariadb.js";
import type { TooltestVO } from "../vo/toolTestVO.js";

type RowOf<T> = T & RowDataPacket;
type TooltestRow = RowOf<TooltestVO>;

export async function selectTooltest(): Promise<TooltestVO[]> {
  const [rows] = await pool.execute<TooltestRow[]>("SELECT * FROM tooltest");
  return rows;
}

export async function insertTooltest(input: string): Promise<void> {
  await pool.execute<ResultSetHeader>(
    "INSERT INTO tooltest (id, value) VALUES (?, ?)",
    ["input-0", input]
  );
}

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
