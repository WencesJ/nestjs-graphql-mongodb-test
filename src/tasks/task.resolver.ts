import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TasksDataWithMetadata } from 'src/common/objectType';
import { CurrentUserType, DataWithMetadata } from 'src/common/types';
import { CurrentUser, Public } from 'src/utils/guard';
import { UserAuthGuard } from 'src/utils/guard/UserAuthGuard';
import { CreateTaskInput } from './dtos/task-create.input';
import { TaskFindAllArgs } from './dtos/task-find.arg';
import { UpdateTaskInput } from './dtos/task-update.input';
import { TaskDoc } from './task.model';
import { TaskService } from './task.service';

@UseGuards(UserAuthGuard)
@Resolver(() => TaskDoc)
export class TaskResolver {
  constructor(private readonly taskService: TaskService) {}

  @Public()
  @Query(() => TasksDataWithMetadata)
  async tasks(
    @Args('queryOptions', { nullable: true })
    queryOptions: TaskFindAllArgs = {},
  ): Promise<DataWithMetadata<TaskDoc>> {
    return this.taskService.findAll(queryOptions);
  }

  @Query(() => TasksDataWithMetadata)
  async myTasks(
    @CurrentUser() user: CurrentUserType,
    @Args('queryOptions', { nullable: true })
    queryOptions: TaskFindAllArgs = {},
  ): Promise<DataWithMetadata<TaskDoc>> {
    return this.taskService.findAll(queryOptions, user.userId);
  }

  @Public()
  @Query(() => TaskDoc)
  async task(@Args('id', { type: () => ID }) id: string): Promise<TaskDoc> {
    return await this.taskService.findById(id);
  }

  @Mutation(() => TaskDoc)
  async createTask(
    @Args('createTaskInput') createTaskInput: CreateTaskInput,
  ): Promise<TaskDoc> {
    return this.taskService.create(createTaskInput);
  }

  @Mutation(() => TaskDoc)
  async updateTask(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateTaskInput') updateTaskInput: UpdateTaskInput,
  ): Promise<TaskDoc> {
    return this.taskService.updateById(id, updateTaskInput);
  }

  @Mutation(() => TaskDoc)
  async removeTask(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TaskDoc> {
    return await this.taskService.deleteById(id);
  }
}
