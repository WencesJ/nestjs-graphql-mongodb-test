import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model } from 'mongoose';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';
import { CreateTaskInput } from '../dtos/task-create.input';
import { TaskRepository } from '../task.repository';
import { Task, TaskSchema } from '../task.schema';

describe('TaskRepository', () => {
  let taskRepository: TaskRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let taskModel: Model<Task>;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    taskModel = mongoConnection.model(Task.name, TaskSchema);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
      ],
      providers: [TaskRepository],
    }).compile();

    taskRepository = module.get<TaskRepository>(TaskRepository);
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

  describe('create', () => {
    it('should create a new task', async () => {
      const taskData: CreateTaskInput = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      };

      const createdTask = await taskRepository.create(taskData);

      expect(createdTask).toBeDefined();
      expect(createdTask.title).toBe(taskData.title);
      expect(createdTask.description).toBe(taskData.description);
      expect(createdTask.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
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
        },
        {
          title: 'Task 3',
          description: 'Description 3',
          priority: TaskPriorityEnum.high,
        },
      ];

      await taskModel.insertMany(tasks);
    });

    it('should return all tasks with default pagination', async () => {
      const tasks = await taskRepository.findAll();

      expect(tasks).toBeDefined();
      expect(tasks.length).toBe(3);
    });

    it('should return paginated tasks', async () => {
      const tasks = await taskRepository.findAll({ page: 1, limit: 2 });

      expect(tasks).toBeDefined();
      expect(tasks.length).toBe(2);
    });

    it('should filter tasks by status', async () => {
      const tasks = await taskRepository.findAll({
        status: TaskStatusEnum.in_progress,
      });

      expect(tasks).toBeDefined();
      expect(tasks.length).toBe(1);
      expect(tasks[0].status).toBe(TaskStatusEnum.in_progress);
    });
  });

  describe('findOne', () => {
    let testTask: Task;

    beforeEach(async () => {
      testTask = await taskModel.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should find a task by id', async () => {
      const foundTask = await taskRepository.findOne({ _id: testTask.id });

      expect(foundTask).toBeDefined();
      expect(foundTask?.id).toEqual(testTask.id);
      expect(foundTask?.title).toBe(testTask.title);
    });

    it('should return null for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const foundTask = await taskRepository.findOne({ id: nonExistentId });

      expect(foundTask).toBeNull();
    });
  });

  describe('updateById', () => {
    let testTask: Task;

    beforeEach(async () => {
      testTask = await taskModel.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should update a task by id', async () => {
      const updatedTask = await taskRepository.updateById(
        testTask.id.toString(),
        {
          title: 'Updated Title',
          status: 'IN_PROGRESS',
        },
      );

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.title).toBe('Updated Title');
      expect(updatedTask?.status).toBe('IN_PROGRESS');
      expect(updatedTask?.id).toEqual(testTask.id);
    });

    it('should return null for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updatedTask = await taskRepository.updateById(nonExistentId, {
        title: 'Updated Title',
      });

      expect(updatedTask).toBeNull();
    });
  });

  describe('deleteById', () => {
    let testTask: Task;

    beforeEach(async () => {
      testTask = await taskModel.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriorityEnum.low,
      });
    });

    it('should delete a task by id', async () => {
      const deletedTask = await taskRepository.deleteById(
        testTask.id.toString(),
      );
      const findTask = await taskModel.findById(testTask.id);

      expect(deletedTask).toBeDefined();
      expect(deletedTask?.id).toEqual(testTask.id);
      expect(findTask).toBeNull();
    });

    it('should return null for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const deletedTask = await taskRepository.deleteById(nonExistentId);

      expect(deletedTask).toBeNull();
    });
  });

  describe('countAll', () => {
    beforeEach(async () => {
      // Insert test data
      const tasks = [
        {
          title: 'Task 1',
          description: 'Description 1',
          status: TaskStatusEnum.completed,
          priority: TaskPriorityEnum.low,
        },
        {
          title: 'Task 2',
          description: 'Description 2',
          status: TaskStatusEnum.completed,
          priority: TaskPriorityEnum.medium,
        },
        {
          title: 'Task 3',
          description: 'Description 3',
          status: TaskStatusEnum.in_progress,
          priority: TaskPriorityEnum.low,
        },
        {
          title: 'Task 4',
          description: 'Description 4',
          status: TaskStatusEnum.in_progress,
          priority: TaskPriorityEnum.high,
        },
      ];

      await taskModel.insertMany(tasks);
    });

    it('should count all tasks when no query is provided', async () => {
      const count = await taskRepository.countAll();
      expect(count).toBe(4);
    });

    it('should count tasks with specific status', async () => {
      const inProgressCount = await taskRepository.countAll({
        status: TaskStatusEnum.in_progress,
      });
      expect(inProgressCount).toBe(2);

      const completedCount = await taskRepository.countAll({
        status: TaskStatusEnum.in_progress,
      });
      expect(completedCount).toBe(2);
    });

    it('should count tasks with multiple filter criteria', async () => {
      const count = await taskRepository.countAll({
        status: TaskStatusEnum.in_progress,
        priority: TaskPriorityEnum.high,
      });
      expect(count).toBe(1);
    });

    it('should return 0 for non-matching criteria', async () => {
      const count = await taskRepository.countAll({
        status: TaskStatusEnum.pending, // non-existent status
      });
      expect(count).toBe(0);
    });
  });
});
