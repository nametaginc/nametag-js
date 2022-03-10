/**
 * Copyright 2022 Nametag Inc.
 *
 * All information contained herein is the property of Nametag Inc.. The
 * intellectual and technical concepts contained herein are proprietary, trade
 * secrets, and/or confidential to Nametag, Inc. and may be covered by U.S.
 * and Foreign Patents, patents in process, and are protected by trade secret or
 * copyright law. Reproduction or distribution, in whole or in part, is
 * forbidden except by express written permission of Nametag, Inc.
 */

export interface IStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export class MemoryStorage implements IStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    const rv = this.data.get(key);
    return rv === undefined ? null : rv;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}
