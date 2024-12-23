import { Match } from './Match'
import { PUT } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

export interface PutOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}

export const Put = (path: string, options?: PutOptions): MethodDecorator => Match(path, { ...options, methods: [PUT] })
