/**
 * Copyright 2021 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
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
