import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { User } from './user.schema';

@ObjectType()
export class UserDoc {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  firstName: User['firstName'];

  @Field(() => String)
  lastName: User['lastName'];

  @Field(() => String)
  email: User['email'];

  @HideField()
  password: User['password'];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
