import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UserStandardLoginInput {
  @Field()
  email: string;

  @Field()
  password: string;
}
