import { Match } from './Match';
import { DecoratorRouteDefinition } from '../declarations';
import { DELETE, GET, OPTIONS, PATCH, POST, PUT } from '../constants';


export interface AnyOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}


export const Any = (path: string, options?: AnyOptions): MethodDecorator => Match(path, { ...options, methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS] });
