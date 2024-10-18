import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { DataWithMetadata } from 'src/common/types';
import { CreateTaskInput } from './dtos/task-create.input';
import { TaskFindAllArgs } from './dtos/task-find.arg';
import { UpdateTaskInput } from './dtos/task-update.input';
import { TaskDoc } from './task.model';
import { TaskRepository } from './task.repository';

@Injectable()
export class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  async findById(id: string): Promise<TaskDoc> {
    if (!isValidObjectId(id)) throw new NotFoundException('Task not found.');

    const task = await this.taskRepository.findOne({ _id: id });

    if (!task) throw new NotFoundException('Task not found.');

    return task;
  }

  async findAll(
    findArgs: TaskFindAllArgs,
    userId?: string,
  ): Promise<DataWithMetadata<TaskDoc>> {
    const { page = 1, limit = 10, ...filter } = findArgs;

    const tasks = await this.taskRepository.findAll({
      ...(userId ? { assignedTo: userId } : {}),
      page,
      limit,
      ...filter,
    });

    const total = await this.taskRepository.countAll({
      ...(userId ? { assignedTo: userId } : {}),
      ...filter,
    });

    return {
      data: tasks,
      metadata: {
        page,
        total,
      },
    };
  }

  async create(createTaskInput: CreateTaskInput): Promise<TaskDoc> {
    const titleExists = await this.taskRepository.findOne({
      title: createTaskInput.title,
    });

    if (titleExists) throw new ConflictException('Title exists! Use another.');

    return await this.taskRepository.create({
      ...createTaskInput,
    });
  }

  async updateById(
    id: string,
    updateTaskInput: UpdateTaskInput,
  ): Promise<TaskDoc> {
    if (updateTaskInput.title) {
      const titleExists = await this.taskRepository.findOne({
        title: updateTaskInput.title,
      });

      if (titleExists)
        throw new ConflictException('Title exists! Use another.');
    }

    const updatedTask = await this.taskRepository.updateById(id, {
      ...updateTaskInput,
    });

    if (!updatedTask) throw new NotFoundException('Task not found.');

    return updatedTask;
  }

  async deleteById(id: string): Promise<TaskDoc> {
    const task = await this.taskRepository.deleteById(id);

    if (!task) throw new NotFoundException('Task not found.');

    return task;
  }
}
