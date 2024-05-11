import deepmerge from 'deepmerge'
import { LogicError, isClass } from '@stone-js/common'

/**
 * Group decorator, usefull for decorating controller class for group route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Group = (definition) => {
  return (target) => {
    if (!isClass(target)) {
      throw new LogicError('This decorator can only be applied at class level')
    }

    const metadata = {
      decorators: {
        route: {
          ...definition,
          action: undefined,
          actions: undefined
        }
      }
    }

    target.metadata = deepmerge(target.metadata ?? {}, metadata)
    return target
  }
}
