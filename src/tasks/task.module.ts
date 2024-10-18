import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/users/user.module';
import { TaskRepository } from './task.repository';
import { TaskResolver } from './task.resolver';
import { Task, TaskSchema } from './task.schema';
import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    AuthModule,
    UserModule,
  ],
  providers: [TaskRepository, TaskService, TaskResolver],
  exports: [TaskService, TaskRepository],
})
export class TaskModule {}
