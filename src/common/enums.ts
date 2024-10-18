import { registerEnumType } from '@nestjs/graphql';

export enum TaskPriorityEnum {
  low = 'low',
  medium = 'medium',
  high = 'high',
}

export enum TaskStatusEnum {
  pending = 'pending',
  in_progress = 'in-progress',
  completed = 'completed',
}

registerEnumType(TaskPriorityEnum, {
  name: 'TaskPriorityEnum', // Mandatory
});

registerEnumType(TaskStatusEnum, {
  name: 'TaskStatusEnum', // Mandatory
});
