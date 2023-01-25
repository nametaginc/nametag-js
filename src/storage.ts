/**
 * Copyright 2021 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
 */

export interface IStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export class MemoryStorage implements IStorage {
  data = new Map<string, string>();

  public get length() {
    return this.data.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys()).sort();
    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    const rv = this.data.get(key);
    console.log("getItem: ", key, "->", rv);
    return rv === undefined ? null : rv;
  }

  removeItem(key: string): void {
    console.log("removeItem: ", key);
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    console.log("setItem: ", key, value);
    this.data.set(key, value);
  }
}
