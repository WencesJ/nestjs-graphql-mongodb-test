// src/resolvers/auth.resolver.ts

import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserDoc } from 'src/users/user.model';
import { LoggedInDoc } from './auth.model';
import { AuthService } from './auth.service';
import { UserStandardLoginInput } from './dtos/login.input';
import { RegisterUserInput } from './dtos/register.input';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => UserDoc)
  async userRegistration(
    @Args('userRegistration') input: RegisterUserInput,
  ): Promise<UserDoc> {
    return this.authService.registerUser(input);
  }

  @Mutation(() => LoggedInDoc)
  async userStandardLogin(
    @Args('userStandardLogin') input: UserStandardLoginInput,
  ): Promise<LoggedInDoc> {
    return this.authService.loginUserWithStandardEmail(input);
  }
}
