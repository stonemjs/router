import { Match } from './Match'
import { POST } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

export interface PostOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}

export const Post = (path: string, options?: PostOptions): MethodDecorator => Match(path, { ...options, methods: [POST] })
