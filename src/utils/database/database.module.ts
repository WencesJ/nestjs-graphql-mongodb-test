import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { configEnv } from '../config';
import { logger } from '../logger';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: configEnv.DATABASE_URL,
        connectionFactory: (connection: Connection) => {
          if (connection.readyState === 1)
            logger.verbose(`✅✅✅ DB Connected!`);
          else if (connection.readyState === 0)
            logger.error('DB Disconnected!');

          return connection;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
