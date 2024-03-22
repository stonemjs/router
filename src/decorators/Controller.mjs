import deepmerge from 'deepmerge'
import { LogicException, isClass, MetaProperty } from '@stone-js/common'

/**
 * Controller decorator, usefull for decorating controller class and define it as a controller.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef  {Object} definition
 * @property {string} name
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Controller = (definition) => {
  return (target) => {
    if (!isClass(target)) {
      throw new LogicException('This decorator can only be applied at class level')
    }

    const metadata = {
      ...definition,
      type: 'service',
      isController: true
    }

    if (!target.prototype.callAction) {
      Reflect.defineProperty(
        target.prototype,
        'callAction', {
          value (method, context) {
            return this[method] instanceof MetaProperty
              ? this[method].invoke(context)
              : this[method](context)
          }
        }
      )
    }

    target.metadata = deepmerge(target.metadata ?? {}, metadata)

    return target
  }
}
