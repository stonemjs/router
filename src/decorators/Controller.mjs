import deepmerge from 'deepmerge'
import { LogicError, isClass, MetaProperty } from '@stone-js/common'

/**
 * options.
 *
 * @memberOf Decorators
 * @typedef  {Object} Decorators.options
 * @property {string} name
 */

/**
 * Controller decorator, usefull for decorating controller class and define it as a controller.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {Decorators.options} options
 * @return {Function}
 */
export const Controller = (options) => {
  return (target) => {
    if (!isClass(target)) {
      throw new LogicError('This decorator can only be applied at class level')
    }

    const metadata = {
      ...options,
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
