import { ConflictException } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { UserRepository } from '../user.repository';
import { User, UserSchema } from '../user.schema';
import { UserService } from '../user.service';

describe('UserService Integration Tests', () => {
  let userService: UserService;
  let userRepository: UserRepository;
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
      ],
      providers: [UserService, UserRepository],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
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

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userService.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
      expect(foundUser?.id).toEqual(createdUser.id);
    });

    it('should return null when user email not found', async () => {
      const foundUser = await userService.findByEmail(
        'nonexistent@example.com',
      );
      expect(foundUser).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userService.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toEqual(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null when user id not found', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const foundUser = await userService.findById(nonExistentId);
      expect(foundUser).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      };

      const createdUser = await userService.create(userData);

      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.firstName).toBe(userData.firstName);
      expect(createdUser.id).toBeDefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      };

      await userService.create(userData);

      await expect(userService.create(userData)).rejects.toThrow(
        ConflictException,
      );
      await expect(userService.create(userData)).rejects.toThrow(
        'Email exists! Use another.',
      );
    });
  });
});
