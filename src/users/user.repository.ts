import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { CreateUserInput } from './dtos/user-create.input';
import { UserFindAllArgs } from './dtos/user-find.arg';
import { IUserRepository } from './user.repository.interface';
import { User } from './user.schema';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: User | CreateUserInput): Promise<User> {
    //Hash user password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await this.userModel.create({ ...data, password: hashedPassword });
  }

  async findOne(query: FilterQuery<User>): Promise<User | null> {
    return await this.userModel.findOne(query);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email });
  }

  async findAll(
    query: FilterQuery<User> & UserFindAllArgs = {},
  ): Promise<User[]> {
    const { page = 1, limit = 10, ...filter } = query;

    let userQueryBuilder = this.userModel.find(filter);

    userQueryBuilder = userQueryBuilder.skip((page - 1) * limit).limit(limit);

    return await userQueryBuilder.exec();
  }

  async updateById(
    id: string,
    fields: UpdateQuery<User>,
  ): Promise<User | null> {
    return await this.userModel.findByIdAndUpdate(id, fields, { new: true });
  }

  async deleteById(id: string): Promise<User | null> {
    return await this.userModel.findByIdAndDelete(id);
  }
}
