import deepmerge from 'deepmerge'
import { LogicException } from '../index.mjs'
import { filterByKeys, isClass } from './utils.mjs'

export const Controller = (definition) => {
  return (target) => {
    if (!isClass(target)) {
      throw new LogicException('This decorator can only be applied at class level')
    }

    const metadata = {
      type: 'service',
      isController: true,
      decorators: {
        route: filterByKeys(definition, ['uri', 'name', 'rules', 'domain', 'methods', 'defaults', 'middleware'])
      }
    }

    Reflect.defineProperty(target.prototype, 'callAction', { value: function (method, context) { this[method](context) } })

    target.metadata = deepmerge(target.metadata ?? {}, metadata)

    return target
  }
}
