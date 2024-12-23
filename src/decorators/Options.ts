import { Match } from './Match'
import { OPTIONS } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

export interface OptionsOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}

export const Options = (path: string, options?: OptionsOptions): MethodDecorator => Match(path, { ...options, methods: [OPTIONS] })
