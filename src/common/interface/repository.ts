import { FilterQuery, UpdateQuery } from 'mongoose';

export interface IRepository<T> {
  //you can add more generic methods like findAll, findOne
  create(t: T): Promise<T>;
  findAll(t?: FilterQuery<T> | Record<string, any>): Promise<T[]>;
  findOne(t: FilterQuery<T>): Promise<T | null>;
  updateById(id: string, t: UpdateQuery<T>): Promise<T | null>;
  deleteById(id: string): Promise<T | null>;
}
