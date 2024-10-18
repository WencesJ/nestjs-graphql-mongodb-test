import {
  Catch,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { logger } from '../logger';

@Catch()
export class ExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown): any {
    logger.error(exception);

    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.name,
          httpInfo: { statusCode: exception.getStatus() },
        },
      });
    }

    const internalServerError = new InternalServerErrorException();

    return new GraphQLError(internalServerError.message, {
      extensions: {
        code: internalServerError.name,
        httpInfo: { statusCode: internalServerError.getStatus() },
      },
    });
  }
}
