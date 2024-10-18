import { Field, InputType } from '@nestjs/graphql';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';

@InputType()
export class UpdateTaskInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => TaskPriorityEnum, { nullable: true })
  priority?: TaskPriorityEnum;

  @Field(() => TaskStatusEnum, { nullable: true })
  status?: TaskStatusEnum;

  @Field({ nullable: true })
  assignedTo?: string;
}
