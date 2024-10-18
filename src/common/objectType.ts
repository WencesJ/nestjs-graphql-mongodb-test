import { Field, ObjectType } from '@nestjs/graphql';
import { TaskDoc } from 'src/tasks/task.model';

@ObjectType()
export class MetadataDoc {
  @Field()
  page: number;

  @Field()
  total: number;
}

@ObjectType()
export class TasksDataWithMetadata {
  @Field(() => [TaskDoc]) // Specify the exact type
  data: TaskDoc[];

  @Field(() => MetadataDoc)
  metadata: MetadataDoc;
}
