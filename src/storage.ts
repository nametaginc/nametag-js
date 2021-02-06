
export interface IStorage {
    getItem(key: string): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
}

export class MemoryStorage implements IStorage {
    data = new Map<string, string>()
    getItem (key: string): string | null {
      const rv = this.data.get(key)
      return rv === undefined ? null : rv
    }

    removeItem (key: string): void {
      this.data.delete(key)
    }

    setItem (key: string, value: string): void {
      this.data.set(key, value)
    }
}
