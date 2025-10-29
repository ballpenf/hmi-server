/**
 * 공유 메모리 변수를 나타내는 클래스
 */
class SharedVariable {
  /**
   * @param {string} id - 변수 ID
   * @param {string} name - 변수 이름
   * @param {string} type - 변수 타입 (bool, int8, uint8, int16, uint16, int32, uint32, int64, uint64, float, double, string)
   * @param {number} size - 변수 크기 (바이트)
   * @param {*} value - 초기 값
   * @param {number} memoryOffset - 메모리 오프셋
   */
  constructor(id, name, type, size, value, memoryOffset) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.size = size;
    this.value = value;
    this.isChanged = false;
    this.lockOffset = memoryOffset;
    this.dataOffset = memoryOffset + 4; // 4 bytes for lock flag
  }

  /**
   * 공유 메모리에서 데이터를 읽습니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   * @returns {Buffer} 읽은 데이터
   */
  readSharedMemory(sharedBuffer, interlockedDll) {
    this.lock(sharedBuffer, interlockedDll);
    try {
      return sharedBuffer.slice(this.dataOffset, this.dataOffset + this.size);
    } finally {
      this.unlock(sharedBuffer, interlockedDll);
    }
  }

  /**
   * 공유 메모리에 데이터를 씁니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Buffer} data - 쓸 데이터
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  writeSharedMemory(sharedBuffer, data, interlockedDll) {
    this.lock(sharedBuffer, interlockedDll);
    try {
      data.copy(sharedBuffer, this.dataOffset, 0, this.size);
    } finally {
      this.unlock(sharedBuffer, interlockedDll);
    }
  }

  /**
   * 변수가 잠겨있는지 확인합니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @returns {boolean} 잠금 상태
   */
  isLock(sharedBuffer) {
    const lockFlag = sharedBuffer.readInt32LE(this.lockOffset);
    return lockFlag !== 0;
  }

  /**
   * 변수를 잠급니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  lock(sharedBuffer, interlockedDll) {
    const lockPointer = sharedBuffer.slice(
      this.lockOffset,
      this.lockOffset + 4
    );

    while (
      interlockedDll.InterlockedCompareExchangeWrapper(lockPointer, 1, 0) !== 0
    ) {
      // console.log(`interlocked(${this.name}) => waiting...`);
      // 스핀락 - 잠금이 해제될 때까지 대기
    }
  }

  /**
   * 변수 잠금을 해제합니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  unlock(sharedBuffer, interlockedDll) {
    const lockPointer = sharedBuffer.slice(
      this.lockOffset,
      this.lockOffset + 4
    );
    interlockedDll.InterlockedCompareExchangeWrapper(lockPointer, 0, 1);
  }

  /**
   * 공유 메모리에서 값을 읽어 파싱합니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   * @returns {*} 파싱된 값
   */
  readValue(sharedBuffer, interlockedDll) {
    const rawData = this.readSharedMemory(sharedBuffer, interlockedDll);
    return this.parseValue(rawData);
  }

  /**
   * 버퍼에서 값을 파싱합니다.
   * @param {Buffer} rawData - 원시 데이터
   * @returns {*} 파싱된 값
   */
  parseValue(rawData) {
    switch (this.type) {
      case "bool":
        return rawData[0] !== 0;
      case "int8":
        return rawData.readInt8(0);
      case "uint8":
        return rawData.readUInt8(0);
      case "int16":
        return rawData.readInt16LE(0);
      case "uint16":
        return rawData.readUInt16LE(0);
      case "int32":
        return rawData.readInt32LE(0);
      case "uint32":
        return rawData.readUInt32LE(0);
      case "int64":
        return rawData.readBigInt64LE(0);
      case "uint64":
        return rawData.readBigUInt64LE(0);
      case "float":
        return rawData.readFloatLE(0);
      case "double":
        return rawData.readDoubleLE(0);
      case "string":
        const nullIndex = rawData.indexOf(0);
        return nullIndex >= 0
          ? rawData.slice(0, nullIndex).toString("utf-8")
          : rawData.toString("utf-8");
      default:
        throw new Error(`Unknown type: ${this.type}`);
    }
  }

  /**
   * 값을 공유 메모리에 씁니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {*} value - 쓸 값
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  writeValue(sharedBuffer, value, interlockedDll) {
    const data = this.serializeValue(value);
    this.writeSharedMemory(sharedBuffer, data, interlockedDll);
  }

  /**
   * 값을 버퍼로 직렬화합니다.
   * @param {*} value - 직렬화할 값
   * @returns {Buffer} 직렬화된 데이터
   */
  serializeValue(value) {
    const buffer = Buffer.alloc(this.size);

    switch (this.type) {
      case "bool":
        buffer.writeUInt8(value ? 1 : 0, 0);
        break;
      case "int8":
        buffer.writeInt8(value, 0);
        break;
      case "uint8":
        buffer.writeUInt8(value, 0);
        break;
      case "int16":
        buffer.writeInt16LE(value, 0);
        break;
      case "uint16":
        buffer.writeUInt16LE(value, 0);
        break;
      case "int32":
        buffer.writeInt32LE(value, 0);
        break;
      case "uint32":
        buffer.writeUInt32LE(value, 0);
        break;
      case "int64":
        buffer.writeBigInt64LE(BigInt(value), 0);
        break;
      case "uint64":
        buffer.writeBigUInt64LE(BigInt(value), 0);
        break;
      case "float":
        buffer.writeFloatLE(value, 0);
        break;
      case "double":
        buffer.writeDoubleLE(value, 0);
        break;
      case "string":
        const strBuffer = Buffer.from(value, "utf-8");
        strBuffer.copy(buffer, 0, 0, Math.min(strBuffer.length, this.size));
        break;
      default:
        throw new Error(`Unknown type: ${this.type}`);
    }

    return buffer;
  }

  /**
   * 공유 메모리에서 로컬 값을 업데이트합니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  updateLocalValue(sharedBuffer, interlockedDll) {
    this.value = this.readValue(sharedBuffer, interlockedDll);
  }

  /**
   * 로컬 값을 공유 메모리에 업데이트합니다.
   * @param {Buffer} sharedBuffer - 공유 메모리 버퍼
   * @param {Object} interlockedDll - Interlocked DLL 객체
   */
  updateSharedValue(sharedBuffer, interlockedDll) {
    if (this.isChanged) {
      this.writeValue(sharedBuffer, this.value, interlockedDll);
      this.isChanged = false;
    }
  }
}

module.exports = SharedVariable;
//export default SharedVariable;
