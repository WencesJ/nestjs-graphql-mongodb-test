import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { UserRepository } from 'src/users/user.repository';
import { User, UserSchema } from 'src/users/user.schema';
import { UserService } from 'src/users/user.service';
import { validateEnv } from 'src/utils/config';
import { AuthResolver } from '../auth.resolver';
import { AuthService } from '../auth.service';

describe('AuthResolver Integration Tests', () => {
  let authResolver: AuthResolver;
  let userService: UserService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    mongoConnection.model(User.name, UserSchema);

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
        ConfigModule.forRoot({ validate: validateEnv }),
        JwtModule.registerAsync({
          async useFactory() {
            return { secret: 'secret' };
          },
        }),
      ],
      providers: [AuthResolver, AuthService, UserService, UserRepository],
    }).compile();

    authResolver = module.get<AuthResolver>(AuthResolver);
    userService = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await module.close();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('userRegistration', () => {
    it('should register a new user successfully', async () => {
      const registrationInput = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test User First',
        lastName: 'Test User Last',
      };

      const result = await authResolver.userRegistration({
        ...registrationInput,
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(registrationInput.email);
      expect(result.firstName).toBe(registrationInput.firstName);
      expect(result.id).toBeDefined();

      // Verify password is hashed
      const user = await userService.findByEmail(registrationInput.email);

      const isPasswordValid = await bcrypt.compare(
        registrationInput.password,
        user!.password,
      );
      expect(isPasswordValid).toBe(true);
    });

    it('should throw error when registering with existing email', async () => {
      const registrationInput = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test User First',
        lastName: 'Test User Last',
      };

      await authResolver.userRegistration({
        ...registrationInput,
      });

      await expect(
        authResolver.userRegistration({
          ...registrationInput,
        }),
      ).rejects.toThrow();
    });
  });

  describe('userStandardLogin', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test User First',
      lastName: 'Test User Last',
    };

    beforeEach(async () => {
      // Create a test user before each login test
      await authResolver.userRegistration({
        ...testUser,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginInput = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await authResolver.userStandardLogin({
        ...loginInput,
      });

      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.firstName).toBe(testUser.firstName);
    });

    it('should throw error when logging in with incorrect password', async () => {
      const loginInput = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      await expect(
        authResolver.userStandardLogin({
          ...loginInput,
        }),
      ).rejects.toThrow();
    });

    it('should throw error when logging in with non-existent email', async () => {
      const loginInput = {
        email: 'nonexistent@example.com',
        password: testUser.password,
      };

      await expect(
        authResolver.userStandardLogin({
          ...loginInput,
        }),
      ).rejects.toThrow();
    });
  });
});
