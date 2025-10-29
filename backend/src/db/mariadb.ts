import { createPool } from "mysql2/promise";

export const pool = createPool({
  host: "127.0.0.1", // 윈도우/도커 환경에선 127.0.0.1 권장
  user: "root",
  password: "1",
  database: "test",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 선택: 서버 기동 시 1회 연결 확인
export async function assertDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log("✅ MariaDB 연결 성공!");
  } finally {
    conn.release();
  }
}
