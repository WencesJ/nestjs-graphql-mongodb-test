import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';

@InputType()
export class CreateTaskInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => TaskPriorityEnum)
  @IsEnum(TaskPriorityEnum)
  priority: TaskPriorityEnum;

  @Field(() => TaskStatusEnum, { nullable: true })
  status?: TaskStatusEnum;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
