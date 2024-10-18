import { ConflictException, NotFoundException } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';
import { UserDoc } from 'src/users/user.model';
import { UserModule } from 'src/users/user.module';
import { UserRepository } from 'src/users/user.repository';
import { User, UserSchema } from 'src/users/user.schema';
import { TaskDoc } from '../task.model';
import { TaskRepository } from '../task.repository';
import { Task, TaskSchema } from '../task.schema';
import { TaskService } from '../task.service';

describe('TaskService Integration Tests', () => {
  let taskService: TaskService;
  let taskRepository: TaskRepository;
  let mongod: MongoMemoryServer;
  let userRepository: UserRepository;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    mongoConnection.model(Task.name, TaskSchema);
    mongoConnection.model(User.name, UserSchema);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        UserModule,
      ],
      providers: [TaskService, TaskRepository],
    }).compile();

    taskService = module.get<TaskService>(TaskService);
    taskRepository = module.get<TaskRepository>(TaskRepository);
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

  describe('findById', () => {
    it('should find a task by id', async () => {
      const createdTask = await taskRepository.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });

      const foundTask = await taskService.findById(createdTask.id);

      expect(foundTask).toBeDefined();
      expect(foundTask.id).toEqual(createdTask.id);
      expect(foundTask.title).toBe(createdTask.title);
    });

    it('should throw NotFoundException when task not found', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await expect(taskService.findById(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    let mockUser: User;

    beforeEach(async () => {
      //create user
      mockUser = await userRepository.create({
        email: 'test@example.com',
        firstName: 'Test User First',
        lastName: 'Test User Last',
        password: 'password123',
      });

      //create tasks
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
          assignedTo: mockUser.id,
        },
        {
          title: 'Task 3',
          description: 'Description 3',
          priority: TaskPriorityEnum.high,
          status: TaskStatusEnum.pending,
        },
      ];

      await Promise.all(tasks.map((task) => taskRepository.create(task)));
    });

    it('should return all tasks with metadata', async () => {
      const result = await taskService.findAll({});

      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(3);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.total).toBe(3);
      expect(result.metadata.page).toBe(1);
    });

    it('should return paginated tasks', async () => {
      const result = await taskService.findAll({ page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.metadata.total).toBe(3);
      expect(result.metadata.page).toBe(1);
    });

    it('should filter tasks by status', async () => {
      const result = await taskService.findAll({
        status: TaskStatusEnum.in_progress,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(TaskStatusEnum.in_progress);
      expect(result.metadata.total).toBe(1);
    });

    it('should filter tasks by userId', async () => {
      const result = await taskService.findAll({}, mockUser.id);

      expect(result.data.length).toBe(1);
      expect(
        result.data.every(
          (task) => (task.assignedTo as UserDoc).id === mockUser.id,
        ),
      ).toBe(true);
      expect(result.metadata.total).toBe(1);
    });

    it('should combine filters with userId', async () => {
      const result = await taskService.findAll(
        { status: TaskStatusEnum.completed },
        mockUser.id,
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(TaskStatusEnum.completed);
      expect((result.data[0].assignedTo as UserDoc).id).toBe(mockUser.id);
      expect(result.metadata.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New Description',
        priority: TaskPriorityEnum.low,
      };

      const createdTask = await taskService.create(taskData);

      expect(createdTask).toBeDefined();
      expect(createdTask.title).toBe(taskData.title);
      expect(createdTask.description).toBe(taskData.description);
      expect(createdTask.id).toBeDefined();
    });

    it('should throw ConflictException when title already exists', async () => {
      const taskData = {
        title: 'Duplicate Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      };

      await taskService.create(taskData);

      await expect(taskService.create(taskData)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateById', () => {
    let existingTask: TaskDoc;

    beforeEach(async () => {
      existingTask = await taskRepository.create({
        title: 'Original Task',
        description: 'Original Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should update a task by id', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated Description',
      };

      const updatedTask = await taskService.updateById(
        existingTask.id,
        updateData,
      );

      expect(updatedTask).toBeDefined();
      expect(updatedTask.title).toBe(updateData.title);
      expect(updatedTask.description).toBe(updateData.description);
      expect(updatedTask.id).toEqual(existingTask.id);
    });

    it('should throw ConflictException when updating to existing title', async () => {
      await taskRepository.create({
        title: 'Another Task',
        description: 'Another Description',
        priority: TaskPriorityEnum.medium,
      });

      await expect(
        taskService.updateById(existingTask.id, { title: 'Another Task' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when updating non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await expect(
        taskService.updateById(nonExistentId, { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteById', () => {
    it('should delete a task by id', async () => {
      const task = await taskRepository.create({
        title: 'Task to Delete',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });

      const deletedTask = await taskService.deleteById(task.id);

      expect(deletedTask).toBeDefined();
      expect(deletedTask.id).toEqual(task.id);

      // Verify task is actually deleted
      await expect(taskService.findById(task.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when deleting non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await expect(taskService.deleteById(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
