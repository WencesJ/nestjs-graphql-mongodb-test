import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';

@InputType()
export class TaskFindAllArgs {
  @Field(() => TaskPriorityEnum, { nullable: true })
  priority?: TaskPriorityEnum;

  @Field(() => TaskStatusEnum, { nullable: true })
  status?: TaskStatusEnum;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;
}

@ArgsType()
export class TaskIdArgs {
  @Field(() => ID)
  id: string;
}
