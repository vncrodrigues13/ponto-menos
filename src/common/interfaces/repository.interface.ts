export interface Repository<T> {
  save(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  findBy(query: Partial<T>): Promise<T[]>;
  count(): Promise<number>;
}
