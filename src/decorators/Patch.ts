import { Match } from './Match'
import { PATCH } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

export interface PatchOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}

export const Patch = (path: string, options?: PatchOptions): MethodDecorator => Match(path, { ...options, methods: [PATCH] })
