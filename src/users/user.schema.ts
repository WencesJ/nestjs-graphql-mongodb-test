import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
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
export class User extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  id: string;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
