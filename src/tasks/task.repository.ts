import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { CreateTaskInput } from './dtos/task-create.input';
import { TaskFindAllArgs } from './dtos/task-find.arg';
import { ITaskRepository } from './task.repository.interface';
import { Task } from './task.schema';

@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>) {}

  async create(data: Task | CreateTaskInput): Promise<Task> {
    //Hash task password
    return (await this.taskModel.create(data)).populate(['assignedTo']);
  }

  async findAll(
    query: FilterQuery<Task> & TaskFindAllArgs = {},
  ): Promise<Task[]> {
    const { page = 1, limit = 10, ...filter } = query;

    let taskQueryBuilder = this.taskModel.find(filter).populate(['assignedTo']);

    taskQueryBuilder = taskQueryBuilder.skip((page - 1) * limit).limit(limit);

    return await taskQueryBuilder.exec();
  }

  async findOne(query: FilterQuery<Task>): Promise<Task | null> {
    return await this.taskModel.findOne(query).populate(['assignedTo']);
  }

  async updateById(
    id: string,
    fields: UpdateQuery<Task>,
  ): Promise<Task | null> {
    return await this.taskModel
      .findByIdAndUpdate(id, fields, { new: true })
      .populate(['assignedTo']);
  }

  async deleteById(id: string): Promise<Task | null> {
    return await this.taskModel.findByIdAndDelete(id);
  }

  async countAll(
    query: FilterQuery<Task> & TaskFindAllArgs = {},
  ): Promise<number> {
    return await this.taskModel.countDocuments(query);
  }
}
