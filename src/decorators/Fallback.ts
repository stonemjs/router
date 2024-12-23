import { Match } from './Match'
import { GET } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

export interface FallbackOptions extends Omit<DecoratorRouteDefinition, 'methods' | 'fallback'> {}

export const Fallback = (path: string, options?: FallbackOptions): MethodDecorator => Match(path, { ...options, methods: [GET], fallback: true })
