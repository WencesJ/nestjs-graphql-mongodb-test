import { TaskPriorityEnum, TaskStatusEnum } from './enums';

export type TaskPriorityType = `${TaskPriorityEnum}`;
export type TaskStatusType = `${TaskStatusEnum}`;

export type DataWithMetadata<T> = {
  data: T[];
  metadata: { page: number; total: number };
};

export type CurrentUserType = {
  userId: string;
  email: string;
};
