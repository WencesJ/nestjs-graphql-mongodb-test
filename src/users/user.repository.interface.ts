import { IRepository } from 'src/common/interface/repository';
import { User } from './user.schema';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
}
