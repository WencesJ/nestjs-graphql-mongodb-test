import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
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
import { validateEnv } from 'src/utils/config';
import * as request from 'supertest';
import { TaskPriorityEnum, TaskStatusEnum } from '../src/common/enums';

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
    let createdTaskId: string;

    it('should create a new task', async () => {
      const createTaskMutation = `
        mutation {
          createTask(createTaskInput: {
            title: "Test Task",
            description: "Test Description",
            priority: low
          }) {
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
          query: createTaskMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createTask).toBeDefined();
      expect(response.body.data.createTask.title).toBe('Test Task');
      expect(response.body.data.createTask.priority).toBe(TaskPriorityEnum.low);
      expect(response.body.data.createTask.status).toBe(TaskStatusEnum.pending);

      createdTaskId = response.body.data.createTask.id;
    });

    it('should not create a task with duplicate title', async () => {
      const createTaskMutation = `
        mutation {
          createTask(createTaskInput: {
            title: "Test Task",
            description: "Duplicate Task",
            priority: low
          }) {
            id
            title
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: createTaskMutation,
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe(
        'Title exists! Use another.',
      );
    });

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

      expect(response.status).toBe(200);
      expect(response.body.data.task).toBeDefined();
      expect(response.body.data.task.id).toBe(createdTaskId);
    });

    it('should update a task', async () => {
      const updateTaskMutation = `
        mutation {
          updateTask(
            id: "${createdTaskId}",
            updateTaskInput: {
              title: "Updated Task",
              status: completed
            }
          ) {
            id
            title
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: updateTaskMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updateTask).toBeDefined();
      expect(response.body.data.updateTask.title).toBe('Updated Task');
      expect(response.body.data.updateTask.status).toBe(
        TaskStatusEnum.completed,
      );
    });

    it('should delete a task', async () => {
      const removeTaskMutation = `
        mutation {
          removeTask(id: "${createdTaskId}") {
            id
            title
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: removeTaskMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.removeTask).toBeDefined();
      expect(response.body.data.removeTask.id).toBe(createdTaskId);

      // Verify task is deleted
      const verifyDeleteQuery = `
        query {
          task(id: "${createdTaskId}") {
            id
          }
        }
      `;

      const verifyResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: verifyDeleteQuery,
        });

      expect(verifyResponse.body.errors).toBeDefined();
      expect(verifyResponse.body.errors[0].message).toBe('Task not found.');
    });

    it('should filter tasks by status', async () => {
      // First create a completed task
      const createCompletedTaskMutation = `
        mutation {
          createTask(createTaskInput: {
            title: "Completed Task",
            description: "This task is completed",
            priority: medium,
            status: completed
          }) {
            id
          }
        }
      `;

      await request(app.getHttpServer()).post('/graphql').send({
        query: createCompletedTaskMutation,
      });

      // Query for completed tasks
      const filterTasksQuery = `
        query {
          tasks(queryOptions: { status: completed, page: 1, limit: 10 }) {
            data {
              title
              status
            }
            metadata {
              total
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: filterTasksQuery,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.data).toBeDefined();
      expect(response.body.data.tasks.data.length).toBe(1);
      expect(response.body.data.tasks.data[0].status).toBe(
        TaskStatusEnum.completed,
      );
    });
  });
});
