import { Logger } from '@nestjs/common';
import { name } from '../../../package.json';

export const logger = new Logger(name);
