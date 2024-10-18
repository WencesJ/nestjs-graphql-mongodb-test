import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dtos/user-create.input';
import { UserDoc } from './user.model';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async findByEmail(email: string): Promise<UserDoc | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserDoc | null> {
    return this.userRepository.findOne({ _id: id });
  }

  async create(createUserInput: CreateUserInput): Promise<UserDoc> {
    const emailExists = await this.findByEmail(createUserInput.email);

    if (emailExists) throw new ConflictException('Email exists! Use another.');

    return this.userRepository.create({
      ...createUserInput,
    });
  }
}
