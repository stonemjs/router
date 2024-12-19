import { Match } from './Match';
import { DELETE } from '../constants';
import { DecoratorRouteDefinition } from '../declarations';


export interface DeleteOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}


export const Delete = (path: string, options?: DeleteOptions): MethodDecorator => Match(path, { ...options, methods: [DELETE] });
