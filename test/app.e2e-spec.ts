import { ApolloDriverConfig } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { TaskModule } from 'src/tasks/task.module';
import { UserModule } from 'src/users/user.module';
import { GraphqlConfig, validateEnv } from 'src/utils/config';
import * as request from 'supertest';

describe('Task Management (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        GraphQLModule.forRoot<ApolloDriverConfig>(GraphqlConfig),
        ConfigModule.forRoot({ validate: validateEnv }),
        JwtModule.registerAsync({
          async useFactory() {
            return { secret: 'secret' };
          },
        }),
        TaskModule,
        AuthModule,
        UserModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('Task Operations', () => {
    const createdTaskId = 'anyid';

    it('should fetch all tasks with pagination', async () => {
      const tasksQuery = `
        query {
          tasks(queryOptions: { page: 1, limit: 10 }) {
            data {
              id
              title
              description
              priority
              status
            }
            metadata {
              total
              page
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: tasksQuery,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.data).toBeDefined();
      expect(response.body.data.tasks.metadata).toBeDefined();
      expect(Array.isArray(response.body.data.tasks.data)).toBe(true);
    });

    it('should fetch a single task by id', async () => {
      const taskQuery = `
        query {
          task(id: "${createdTaskId}") {
            id
            title
            description
            priority
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: taskQuery,
        });

      expect(response.body.errors).toBeDefined();
    });
  });
});
