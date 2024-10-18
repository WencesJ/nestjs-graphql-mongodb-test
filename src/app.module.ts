import { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './tasks/task.module';
import { UserModule } from './users/user.module';
import { GraphqlConfig, validateEnv } from './utils/config';
import { DatabaseModule } from './utils/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    GraphQLModule.forRoot<ApolloDriverConfig>(GraphqlConfig),
    DatabaseModule,
    TaskModule,
    AuthModule,
    UserModule,
  ],
  providers: [AppService],
})
export class AppModule {}
