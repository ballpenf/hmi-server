export default class SharedVariable {
  constructor(
    id: string,
    name: string,
    type: string,
    size: number,
    value: any,
    memoryOffset: number
  );

  id: string;
  name: string;
  type: string;
  size: number;
  value: any;
  isChanged: boolean;
  lockOffset: number;
  dataOffset: number;

  readSharedMemory(sharedBuffer: Buffer, interlockedDll: any): Buffer;
  writeSharedMemory(
    sharedBuffer: Buffer,
    data: Buffer,
    interlockedDll: any
  ): void;
  isLock(sharedBuffer: Buffer): boolean;
  lock(sharedBuffer: Buffer, interlockedDll: any): void;
  unlock(sharedBuffer: Buffer, interlockedDll: any): void;
  readValue(sharedBuffer: Buffer, interlockedDll: any): any;
  writeValue(sharedBuffer: Buffer, value: any, interlockedDll: any): void;
  parseValue(rawData: Buffer): any;
  serializeValue(value: any): Buffer;
  updateLocalValue(sharedBuffer: Buffer, interlockedDll: any): void;
  updateSharedValue(sharedBuffer: Buffer, interlockedDll: any): void;
}
