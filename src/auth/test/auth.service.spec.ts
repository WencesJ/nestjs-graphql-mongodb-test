import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { UserRepository } from 'src/users/user.repository';
import { User, UserSchema } from 'src/users/user.schema';
import { UserService } from 'src/users/user.service';
import { validateEnv } from 'src/utils/config';
import { AuthService } from '../auth.service';

describe('AuthService Integration Tests', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    mongoConnection.model(User.name, UserSchema);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        ConfigModule.forRoot({ validate: validateEnv }),
        JwtModule.registerAsync({
          async useFactory() {
            return { secret: 'secret' };
          },
        }),
      ],
      providers: [AuthService, UserService, UserRepository],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('validateUserCredentials', () => {
    it('should return user when credentials are valid', async () => {
      const password = 'testPassword123';

      const user = await userService.create({
        email: 'test@example.com',
        password,
        firstName: 'Test User First',
        lastName: 'Test User Last',
      });

      const validatedUser = await authService.validateUserCredentials(
        'test@example.com',
        password,
      );

      expect(validatedUser).toBeDefined();
      expect(validatedUser?.id).toEqual(user.id);
      expect(validatedUser?.email).toBe(user.email);
    });

    it('should return null when email is invalid', async () => {
      const validatedUser = await authService.validateUserCredentials(
        'nonexistent@example.com',
        'password123',
      );

      expect(validatedUser).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await userService.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test User First',
        lastName: 'Test User Last',
      });

      const validatedUser = await authService.validateUserCredentials(
        'test@example.com',
        'wrongPassword',
      );

      expect(validatedUser).toBeNull();
    });
  });

  describe('loginUserWithStandardEmail', () => {
    it('should return access token and user when credentials are valid', async () => {
      const password = 'testPassword123';

      const user = await userService.create({
        email: 'test@example.com',
        password,
        firstName: 'Test User First',
        lastName: 'Test User Last',
      });

      const result = await authService.loginUserWithStandardEmail({
        email: 'test@example.com',
        password: password,
      });

      expect(result.access_token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toEqual(user.id);
      expect(result.user.email).toBe(user.email);

      // Verify JWT token
      const decodedToken = jwtService.verify(result.access_token);
      expect(decodedToken.email).toBe(user.email);
      expect(decodedToken.userId).toBe(user.id);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      await expect(
        authService.loginUserWithStandardEmail({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Test User First',
        lastName: 'Test User Last',
      };

      const registeredUser = await authService.registerUser(registerData);

      expect(registeredUser).toBeDefined();
      expect(registeredUser.email).toBe(registerData.email);
      expect(registeredUser.firstName).toBe(registerData.firstName);

      // Verify password is hashed
      const isPasswordValid = await bcrypt.compare(
        registerData.password,
        registeredUser.password,
      );
      expect(isPasswordValid).toBe(true);
    });

    it('should throw ConflictException when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test User First',
        lastName: 'Test User Last',
      };

      await authService.registerUser(userData);

      await expect(authService.registerUser(userData)).rejects.toThrow();
    });
  });

  describe('verifyJWT', () => {
    it('should return payload for a valid JWT', async () => {
      const user = await userService.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const payload = { email: user.email, userId: user.id };
      const token = jwtService.sign(payload);

      const result = await authService.verifyJWT(token);

      expect(result).toBeDefined();
      expect(result.email).toBe(user.email);
      expect(result.userId).toBe(user.id);
    });

    it('should throw UnauthorizedException for an expired token', async () => {
      const payload = { email: 'test@example.com', userId: '123' };
      const token = jwtService.sign(payload, { expiresIn: '1ms' });

      // Wait for the token to expire
      await new Promise((resolve) => setTimeout(resolve, 5));

      await expect(authService.verifyJWT(token)).rejects.toThrow(
        new UnauthorizedException('Token Expired! Please Sign in.'),
      );
    });

    it('should throw UnauthorizedException for an invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(authService.verifyJWT(invalidToken)).rejects.toThrow(
        new UnauthorizedException('Invalid Token! Please Sign in.'),
      );
    });
  });
});
