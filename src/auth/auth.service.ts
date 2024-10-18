import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDoc } from 'src/users/user.model';
import { UserService } from 'src/users/user.service';
import { UserStandardLoginInput } from './dtos/login.input';
import { RegisterUserInput } from './dtos/register.input';

@Injectable()
export class AuthService {
  [x: string]: any;
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<UserDoc | null> {
    const user = await this.userService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) return null;

    return user;
  }

  async loginUserWithStandardEmail(data: UserStandardLoginInput) {
    const user = await this.validateUserCredentials(data.email, data.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, userId: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async registerUser(data: RegisterUserInput) {
    return await this.userService.create(data);
  }

  async verifyJWT(jwt: string) {
    try {
      const payload = this.jwtService.verify(jwt);

      return payload;
    } catch (error) {
      if (error.message.includes('expired')) {
        throw new UnauthorizedException('Token Expired! Please Sign in.');
      }
      if (
        error.message.includes('invalid') ||
        error.message.includes('malformed')
      ) {
        throw new UnauthorizedException('Invalid Token! Please Sign in.');
      }

      throw error;
    }
  }
}
