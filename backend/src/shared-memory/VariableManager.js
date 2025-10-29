const path = require("path");
const addon = require("./addon");
const XMLParser = require("./XMLParser");
const SharedVariable = require("./SharedVariable");

// Windows Shared Memory 관련 상수
const INVALID_HANDLE_VALUE = -1;
const PAGE_READWRITE = 0x04;
const FILE_MAP_ALL_ACCESS = 0xf001f;

/**
 * 공유 메모리 변수 관리 클래스
 */
class VariableManager {
  /**
   * @param {string} configPath - 설정 파일 경로
   * @param {string} fileName - 설정 파일 이름
   */
  constructor(configPath, fileName) {
    this.configPath = configPath;
    this.fileName = fileName;
    this.sharedMemoryName = null;
    this.sharedMemoryHandle = null;
    this.sharedBuffer = null;
    this.sharedMemorySize = 0;
    this.sharedVariables = new Map();
    this.dataSync = false;
    this.localDataMode = false;
    this.interlockedDll = null;
  }

  // getConfigFilePath() {
  //   return path.join(this.configPath, this.fileName);
  // }
  getConfigFilePath() {
    const absPath = path.isAbsolute(this.configPath)
      ? this.configPath
      : path.join(process.cwd(), this.configPath);
    const full = path.join(absPath, this.fileName);
    return full;
  }

  getVariableSize(type, configSize) {
    switch (type) {
      case "bool":
      case "int8":
      case "uint8":
        return 1;
      case "int16":
      case "uint16":
        return 2;
      case "int32":
      case "uint32":
      case "float":
        return 4;
      case "int64":
      case "uint64":
      case "double":
        return 8;
      case "string":
        if (configSize === null || configSize === undefined) {
          return 256;
        }
        try {
          const size = parseInt(configSize, 10);
          return size > 0 ? size : 256;
        } catch {
          return 256;
        }
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  getVariableValue(type, configValue) {
    if (configValue === null || configValue === undefined) {
      switch (type) {
        case "bool":
          return false;
        case "int8":
        case "uint8":
        case "int16":
        case "uint16":
        case "int32":
        case "uint32":
        case "int64":
        case "uint64":
        case "float":
        case "double":
          return 0;
        case "string":
          return "";
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    }

    switch (type) {
      case "bool":
        return String(configValue).trim().toLowerCase() === "true";
      case "int8":
      case "uint8":
      case "int16":
      case "uint16":
      case "int32":
      case "uint32":
      case "int64":
      case "uint64":
        try {
          return parseInt(configValue, 10);
        } catch {
          return 0;
        }
      case "float":
      case "double":
        try {
          return parseFloat(configValue);
        } catch {
          return 0;
        }
      case "string":
        try {
          return String(configValue);
        } catch {
          return "";
        }
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  insertVariable(configVariable, startOffset) {
    const key = `${configVariable.id}:${configVariable.name}`;

    if (this.sharedVariables.has(key)) {
      // console.warn(
      //   `Duplicate variable key: ${key}, can't insert to variable list`
      // );
      return 0;
    }

    const size = this.getVariableSize(configVariable.type, configVariable.size);
    const value = this.getVariableValue(
      configVariable.type,
      configVariable.value
    );

    const variable = new SharedVariable(
      configVariable.id,
      configVariable.name,
      configVariable.type,
      size,
      value,
      startOffset
    );

    this.sharedVariables.set(key, variable);

    return 4 + size;
  }

  loadVariableList() {
    const xmlParser = new XMLParser();
    const config = xmlParser.parseConfigurationXMLSync(
      this.getConfigFilePath()
    );

    const variableList = config.root.VariableList;
    this.sharedMemoryName = variableList.shared_memory_name;

    // node-addon-api 기반 네이티브 모듈 사용
    this.interlockedDll = {
      InterlockedCompareExchangeWrapper:
        addon.InterlockedCompareExchangeWrapper,
    };

    let startOffset = 0;
    if (this.dataSync) {
      startOffset += 4;
    }

    const variables = variableList.Variable;
    if (Array.isArray(variables)) {
      for (const variable of variables) {
        startOffset += this.insertVariable(variable, startOffset);
      }
    } else if (typeof variables === "object") {
      startOffset += this.insertVariable(variables, startOffset);
    }

    return startOffset;
  }

  createVariableManager(dataSync = false) {
    this.dataSync = dataSync;
    this.sharedMemorySize = this.loadVariableList();

    if (this.sharedMemorySize <= 0) {
      console.error("No variables loaded");
      return false;
    }

    // addon에서 직접 공유 메모리 생성
    this.sharedMemoryHandle = addon.CreateFileMappingA(
      INVALID_HANDLE_VALUE,
      null,
      PAGE_READWRITE,
      0,
      this.sharedMemorySize,
      this.sharedMemoryName
    );

    if (!this.sharedMemoryHandle) {
      console.error("Failed to create shared memory");
      return false;
    }

    // addon에서 직접 MapViewOfFile 호출
    const pBuf = addon.MapViewOfFile(
      this.sharedMemoryHandle,
      FILE_MAP_ALL_ACCESS,
      0,
      0,
      this.sharedMemorySize
    );

    if (!pBuf) {
      console.error("Failed to map view of file");
      addon.CloseHandle(this.sharedMemoryHandle);
      return false;
    }

    // Buffer로 래핑 (addon에서 반환된 포인터를 Buffer로 변환하는 함수 필요)
    this.sharedBuffer = addon.BufferFromPointer(pBuf, this.sharedMemorySize);
    this.sharedBufferPointer = pBuf; // 포인터 따로 저장

    for (const variable of this.sharedVariables.values()) {
      variable.writeValue(
        this.sharedBuffer,
        variable.value,
        this.interlockedDll
      );
    }

    console.log(
      `Shared memory created: ${this.sharedMemoryName} (${this.sharedMemorySize} bytes)`
    );
    return true;
  }

  openVariableManager(dataSync = false) {
    this.dataSync = dataSync;
    this.sharedMemorySize = this.loadVariableList();

    if (this.sharedMemorySize <= 0) {
      console.error("No variables loaded");
      return false;
    }

    this.sharedMemoryHandle = addon.OpenFileMappingA(
      FILE_MAP_ALL_ACCESS,
      0,
      this.sharedMemoryName
    );

    if (!this.sharedMemoryHandle) {
      console.error("Failed to open shared memory");
      return false;
    }

    const pBuf = addon.MapViewOfFile(
      this.sharedMemoryHandle,
      FILE_MAP_ALL_ACCESS,
      0,
      0,
      this.sharedMemorySize
    );

    if (!pBuf) {
      console.error("Failed to map view of file");
      addon.CloseHandle(this.sharedMemoryHandle);
      return false;
    }

    this.sharedBuffer = addon.BufferFromPointer(pBuf, this.sharedMemorySize);
    console.log("\n================ OPEN MANAGER START ================\n");
    if (!this.sharedBuffer) {
      console.error("❌ sharedBuffer is NULL (addon.BufferFromPointer failed)");
      return false;
    }
    this.sharedBufferPointer = pBuf;

    console.log(
      `Shared memory opened: ${this.sharedMemoryName} (${this.sharedMemorySize} bytes)`
    );
    return true;
  }

  close() {
    if (this.sharedBufferPointer) {
      addon.UnmapViewOfFile(this.sharedBufferPointer);
      this.sharedBuffer = null;
      this.sharedBufferPointer = null;
    }
    if (this.sharedMemoryHandle) {
      addon.CloseHandle(this.sharedMemoryHandle);
      this.sharedMemoryHandle = null;
    }
  }

  isLock() {
    if (this.dataSync) {
      const lockFlag = this.sharedBuffer.readInt32LE(0);
      return lockFlag !== 0;
    }
    return false;
  }

  lock() {
    if (this.dataSync) {
      const lockPointer = this.sharedBuffer.slice(0, 4);
      while (
        this.interlockedDll.InterlockedCompareExchangeWrapper(
          lockPointer,
          1,
          0
        ) !== 0
      ) {
        // waiting...
      }
    }
  }

  unlock() {
    if (this.dataSync) {
      const lockPointer = this.sharedBuffer.slice(0, 4);
      this.interlockedDll.InterlockedCompareExchangeWrapper(lockPointer, 0, 1);
    }
  }

  updateLocalMemory() {
    this.lock();
    try {
      for (const variable of this.sharedVariables.values()) {
        while (variable.isLock(this.sharedBuffer)) {
          // waiting...
        }
        variable.updateLocalValue(this.sharedBuffer, this.interlockedDll);
      }
    } finally {
      this.unlock();
      this.localDataMode = true;
    }
  }

  updateSharedMemory() {
    this.lock();
    try {
      for (const variable of this.sharedVariables.values()) {
        while (variable.isLock(this.sharedBuffer)) {
          // waiting...
        }
        variable.updateSharedValue(this.sharedBuffer, this.interlockedDll);
      }
    } finally {
      this.unlock();
      this.localDataMode = false;
    }
  }

  set(key, value) {
    if (!this.sharedVariables.has(key)) {
      throw new Error(`Key '${key}' not found.`);
    }

    if (this.dataSync) {
      while (this.isLock()) {
        // waiting...
      }
    }

    if (!this.localDataMode) {
      const variable = this.sharedVariables.get(key);
      variable.writeValue(this.sharedBuffer, value, this.interlockedDll);
    } else {
      const variable = this.sharedVariables.get(key);
      if (variable.value !== value) {
        variable.value = value;
        variable.isChanged = true;
      }
    }
  }

  get(key) {
    if (!this.sharedVariables.has(key)) {
      throw new Error(`Key '${key}' not found.`);
    }

    if (this.dataSync) {
      while (this.isLock()) {
        // waiting...
      }
    }

    const variable = this.sharedVariables.get(key);

    if (!this.localDataMode) {
      return variable.readValue(this.sharedBuffer, this.interlockedDll);
    } else {
      return variable.value;
    }
  }

  getVariableKeys() {
    return Array.from(this.sharedVariables.keys());
  }

  getVariableInfo(key) {
    if (!this.sharedVariables.has(key)) {
      throw new Error(`Key '${key}' not found.`);
    }

    const variable = this.sharedVariables.get(key);
    return {
      id: variable.id,
      name: variable.name,
      type: variable.type,
      size: variable.size,
      lockOffset: variable.lockOffset,
      dataOffset: variable.dataOffset,
    };
  }
}

module.exports = VariableManager;
