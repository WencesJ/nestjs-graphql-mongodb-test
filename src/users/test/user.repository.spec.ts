import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection } from 'mongoose';
import { UserRepository } from '../user.repository';
import { User, UserSchema } from '../user.schema';
// jest.mock('bcrypt');

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    mongoConnection.model(User.name, UserSchema);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UserRepository],
    }).compile();

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

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
  });

  describe('methods', () => {
    it('create should be defined', async () => {
      expect(userRepository.create).toBeDefined();
    });

    it('findOne should be defined', async () => {
      expect(userRepository.findOne).toBeDefined();
    });

    it('getByEmail should be defined', async () => {
      expect(userRepository.findByEmail).toBeDefined();
    });
  });

  describe('create', () => {
    it('hashes password before create', async () => {
      const userData = {
        firstName: 'user-first',
        lastName: 'user-last',
        email: `user.email@example.com`,
        password: 'StrongPassword123!',
      };

      jest.spyOn(bcrypt, 'hash').getMockImplementation();

      await userRepository.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
    });
  });
});
