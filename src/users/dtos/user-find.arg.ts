import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UserFindAllArgs {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;
}

@ArgsType()
export class UserIdArgs {
  @Field(() => ID)
  id: string;
}
