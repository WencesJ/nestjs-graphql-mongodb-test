import { Field, ID, ObjectType } from '@nestjs/graphql';
import { UserDoc } from 'src/users/user.model';
import { Task } from './task.schema';

@ObjectType()
export class TaskDoc {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: Task['title'];

  @Field(() => String)
  description: Task['description'];

  @Field(() => String)
  priority: Task['priority'];

  @Field(() => String)
  status: Task['status'];

  @Field(() => UserDoc || String, { nullable: true })
  assignedTo?: UserDoc | string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
