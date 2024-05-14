import deepmerge from 'deepmerge'
import { classLevelDecoratorChecker } from '@stone-js/common'

/**
 * Controller options.
 *
 * @memberOf Decorators
 * @typedef  {Object} Decorators.options
 * @property {boolean} singleton
 * @property {(string|string[])} alias
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
export const Controller = (options = {}) => {
  return (target) => {
    classLevelDecoratorChecker(target)

    const metadata = {
      routeGroup: {},
      controller: options,
      service: { singleton: true, ...options }
    }

    target.$$metadata$$ = deepmerge(target.$$metadata$$ ?? {}, metadata)

    return target
  }
}
