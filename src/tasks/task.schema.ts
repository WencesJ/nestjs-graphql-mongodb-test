import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskPriorityEnum, TaskStatusEnum } from 'src/common/enums';
import { User } from 'src/users/user.schema';
import { mongooseSchemaRemoveProps } from 'src/utils/helper';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: mongooseSchemaRemoveProps(),
    getters: true,
  },
  toObject: { virtuals: true },
})
export class Task extends Document {
  @Prop({ required: true, unique: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    enum: {
      values: Object.values(TaskPriorityEnum),
      message: `{{VALUE}} must be either ${Object.values(TaskPriorityEnum).join('|')}`,
    },
    default: TaskPriorityEnum.low,
  })
  priority: string;

  @Prop({
    enum: {
      values: Object.values(TaskStatusEnum),
      message: `{{VALUE}} must be either ${Object.values(TaskStatusEnum).join('|')}`,
    },
    default: TaskStatusEnum.pending,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  assignedTo?: string;

  id: string;

  createdAt: Date;

  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
