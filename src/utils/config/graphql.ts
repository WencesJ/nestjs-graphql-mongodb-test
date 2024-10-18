import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLError } from 'graphql';
import { join } from 'path';

export const GraphqlConfig = {
  driver: ApolloDriver,
  playground: true,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  formatError: (error: GraphQLError) => {
    return {
      message: error.message,
      code: error.extensions?.code,
      httpInfo: error.extensions?.httpInfo,
    };
  },
};
