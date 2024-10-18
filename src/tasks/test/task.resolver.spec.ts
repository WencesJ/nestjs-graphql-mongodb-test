import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';
import { UserDoc } from 'src/users/user.model';
import { UserModule } from 'src/users/user.module';
import { UserRepository } from 'src/users/user.repository';
import { User, UserSchema } from 'src/users/user.schema';
import { validateEnv } from 'src/utils/config';
import { CreateTaskInput } from '../dtos/task-create.input';
import { TaskFindAllArgs } from '../dtos/task-find.arg';
import { UpdateTaskInput } from '../dtos/task-update.input';
import { TaskRepository } from '../task.repository';
import { TaskResolver } from '../task.resolver';
import { Task, TaskSchema } from '../task.schema';
import { TaskService } from '../task.service';

describe('TaskResolver Integration Tests', () => {
  let taskResolver: TaskResolver;
  let taskRepository: TaskRepository;
  let userRepository: UserRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    mongoConnection.model(Task.name, TaskSchema);
    mongoConnection.model(User.name, UserSchema);

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        ConfigModule.forRoot({ validate: validateEnv }),
        JwtModule.registerAsync({
          async useFactory() {
            return { secret: 'secret' };
          },
        }),
        AuthModule,
        UserModule,
      ],
      providers: [TaskResolver, TaskService, TaskRepository],
    }).compile();

    taskResolver = module.get<TaskResolver>(TaskResolver);
    userRepository = module.get<UserRepository>(UserRepository);
    taskRepository = module.get<TaskRepository>(TaskRepository);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    if (mongoConnection) {
      await mongoConnection.dropDatabase();
      await mongoConnection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  afterEach(async () => {
    try {
      const collections = mongoConnection.collections;
      await Promise.all(
        Object.values(collections).map(async (collection) => {
          await collection.deleteMany({});
        }),
      );
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  });

  describe('tasks Query', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        {
          title: 'Task 1',
          description: 'Description 1',
          priority: TaskPriorityEnum.low,
          status: TaskStatusEnum.in_progress,
        },
        {
          title: 'Task 2',
          description: 'Description 2',
          priority: TaskPriorityEnum.medium,
          status: TaskStatusEnum.completed,
        },
        {
          title: 'Task 3',
          description: 'Description 3',
          priority: TaskPriorityEnum.high,
          status: TaskStatusEnum.pending,
        },
      ];

      for (const task of tasks) {
        await taskRepository.create(task);
      }
    });

    it('should return all tasks with metadata when no query options provided', async () => {
      const queryOptions: TaskFindAllArgs = {};
      const result = await taskResolver.tasks(queryOptions);

      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(3);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.total).toBe(3);
      expect(result.metadata.page).toBe(1);
    });

    it('should return paginated tasks', async () => {
      const queryOptions: TaskFindAllArgs = { page: 1, limit: 2 };
      const result = await taskResolver.tasks(queryOptions);

      expect(result.data.length).toBe(2);
      expect(result.metadata.total).toBe(3);
      expect(result.metadata.page).toBe(1);
    });

    it('should filter tasks by status', async () => {
      const queryOptions: TaskFindAllArgs = {
        status: TaskStatusEnum.in_progress,
      };
      const result = await taskResolver.tasks(queryOptions);

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(TaskStatusEnum.in_progress);
    });
  });

  describe('myTasks Query', () => {
    let mockUser: User;

    beforeEach(async () => {
      //create user
      mockUser = await userRepository.create({
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      });
      // Create test tasks for the user
      const tasks = [
        {
          title: 'User Task 1',
          description: 'Description 1',
          priority: TaskPriorityEnum.low,
          status: TaskStatusEnum.in_progress,
          assignedTo: mockUser.id,
        },
        {
          title: 'User Task 2',
          description: 'Description 2',
          priority: TaskPriorityEnum.medium,
          status: TaskStatusEnum.completed,
          assignedTo: mockUser.id,
        },
        {
          title: 'Other User Task',
          description: 'Description 3',
          priority: TaskPriorityEnum.high,
          status: TaskStatusEnum.pending,
          assignedTo: 'otherUser123',
        },
      ];

      for (const task of tasks) {
        await taskRepository.create(task);
      }
    });

    it('should return only tasks for the current user', async () => {
      const queryOptions: TaskFindAllArgs = {};
      const result = await taskResolver.myTasks(
        { userId: mockUser.id, email: mockUser.email },
        queryOptions,
      );

      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(2);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.total).toBe(2);
      expect(result.metadata.page).toBe(1);
      expect((result.data[0].assignedTo as UserDoc).id).toBe(mockUser.id);
    });

    it('should apply query options to user tasks', async () => {
      const queryOptions: TaskFindAllArgs = {
        status: TaskStatusEnum.completed,
      };
      const result = await taskResolver.myTasks(
        { userId: mockUser.id, email: mockUser.email },
        queryOptions,
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(TaskStatusEnum.completed);
      expect((result.data[0].assignedTo as UserDoc).id).toBe(mockUser.id);
    });
  });

  describe('task Query', () => {
    let testTask: Task;

    beforeEach(async () => {
      testTask = await taskRepository.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should return a task by id', async () => {
      const result = await taskResolver.task(testTask.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(testTask.id);
      expect(result.title).toBe(testTask.title);
    });

    it('should throw NotFoundException when task not found', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await expect(taskResolver.task(nonExistentId)).rejects.toThrow(
        'Task not found.',
      );
    });
  });

  describe('createTask Mutation', () => {
    it('should create a new task', async () => {
      const createTaskInput: CreateTaskInput = {
        title: 'New Task',
        description: 'New Description',
        priority: TaskPriorityEnum.low,
      };

      const result = await taskResolver.createTask(createTaskInput);

      expect(result).toBeDefined();
      expect(result.title).toBe(createTaskInput.title);
      expect(result.description).toBe(createTaskInput.description);
      expect(result.priority).toBe(createTaskInput.priority);
    });

    it('should throw ConflictException when title already exists', async () => {
      const createTaskInput: CreateTaskInput = {
        title: 'Duplicate Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      };

      await taskResolver.createTask(createTaskInput);

      await expect(taskResolver.createTask(createTaskInput)).rejects.toThrow(
        'Title exists! Use another.',
      );
    });
  });

  describe('updateTask Mutation', () => {
    let existingTask: Task;

    beforeEach(async () => {
      existingTask = await taskRepository.create({
        title: 'Original Task',
        description: 'Original Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should update an existing task', async () => {
      const updateTaskInput: UpdateTaskInput = {
        title: 'Updated Task',
        description: 'Updated Description',
      };

      const result = await taskResolver.updateTask(
        existingTask.id,
        updateTaskInput,
      );

      expect(result).toBeDefined();
      expect(result.title).toBe(updateTaskInput.title);
      expect(result.description).toBe(updateTaskInput.description);
      expect(result.id).toBe(existingTask.id);
    });

    it('should throw ConflictException when updating to existing title', async () => {
      // Create another task
      await taskRepository.create({
        title: 'Another Task',
        description: 'Another Description',
        priority: TaskPriorityEnum.medium,
      });

      const updateTaskInput: UpdateTaskInput = {
        title: 'Another Task',
      };

      await expect(
        taskResolver.updateTask(existingTask.id, updateTaskInput),
      ).rejects.toThrow('Title exists! Use another.');
    });

    it('should throw NotFoundException when updating non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updateTaskInput: UpdateTaskInput = {
        title: 'Updated Title',
      };

      await expect(
        taskResolver.updateTask(nonExistentId, updateTaskInput),
      ).rejects.toThrow('Task not found.');
    });
  });

  describe('removeTask Mutation', () => {
    let taskToDelete: Task;

    beforeEach(async () => {
      taskToDelete = await taskRepository.create({
        title: 'Task to Delete',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should remove a task', async () => {
      const result = await taskResolver.removeTask(taskToDelete.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(taskToDelete.id);

      // Verify task is deleted
      await expect(taskResolver.task(taskToDelete.id)).rejects.toThrow(
        'Task not found.',
      );
    });

    it('should throw NotFoundException when removing non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await expect(taskResolver.removeTask(nonExistentId)).rejects.toThrow(
        'Task not found.',
      );
    });
  });
});
