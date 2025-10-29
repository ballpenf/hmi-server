import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// shared-memory 폴더 안의 CommonJS 모듈 import
const { VariableManager, XMLParser } = require("../shared-memory/index.js");

export interface VariableInfo {
  id: number;
  name: string;
  type: string;
  size: number;
  lockOffset: number;
  dataOffset: number;
}

export default class SharedMemoryService {
  private manager: any;
  private sharedMemoryName: string;
  private configPath: string;
  private xmlFile: string;

  constructor() {
    this.configPath = path.resolve("./src/shared-memory");
    this.xmlFile = "VariableList.xml";

    // 1️⃣ XML 파싱
    const parser = new XMLParser();
    const config = parser.parseConfigurationXMLSync(
      path.join(this.configPath, this.xmlFile)
    );

    const variableList = config.root?.VariableList ?? config.VariableList;
    this.sharedMemoryName = variableList.shared_memory_name;

    // 2️⃣ VariableManager 생성
    this.manager = new VariableManager(this.configPath, this.xmlFile);

    // 3️⃣ 뷰어에서 생성된 공유메모리 열기 시도
    let success = this.manager.openVariableManager(false);

    if (!success) {
      console.warn(
        `❌ 공유메모리 '${this.sharedMemoryName}' 없음 → 뷰어에서 아직 생성되지 않음`
      );
      console.warn(
        `🕒 뷰어 실행 후 서버 재시작 필요 (서버에서는 공유메모리를 생성하지 않음)`
      );
      throw new Error("Shared memory not found. Viewer must create it first.");
    }

    console.log(`✅ 공유메모리 연결 성공 (${this.sharedMemoryName})`);
  }

  /** 단일 변수 읽기 */
  get(id: number, name: string) {
    const key = `${id}:${name}`;
    try {
      return this.manager.get(key);
    } catch (err) {
      console.error(`[GET ERROR] ${key} - ${(err as Error).message}`);
      return null;
    }
  }

  /** 단일 변수 쓰기 */
  set(id: number, name: string, value: any) {
    const key = `${id}:${name}`;
    try {
      this.manager.set(key, value);
    } catch (err) {
      console.error(`[SET ERROR] ${key} - ${(err as Error).message}`);
    }
  }

  /** 전체 변수 키 목록 */
  keys(): string[] {
    return this.manager.getVariableKeys();
  }

  /** 변수 정보 조회 */
  info(key: string): VariableInfo {
    return this.manager.getVariableInfo(key);
  }

  /** 공유 메모리 닫기 */
  close() {
    this.manager.close();
    console.log("🧹 공유메모리 닫힘");
  }
}
