import { routerOptions } from '@stone-js/router/config'
import { classLevelDecoratorChecker, merge } from '@stone-js/common'

/**
 * Decorators, Useful for decorating classes.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @namespace Decorators
 */

/**
 * Router Decorator: Useful for customizing classes for router using.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {Object} [options={}] - The decorator configuration options.
 * @param  {Object} [options.rules={}]
 * @param  {number} [options.maxDepth=5]
 * @param  {string} [options.prefix=null]
 * @param  {Object} [options.defaults={}]
 * @param  {boolean} [options.strict=false]
 * @param  {Object} [options.dispatchers={}]
 * @param  {Function[]} [options.matchers=[]]
 * @param  {Function[]} [options.middleware=[]]
 * @param  {definition[]} [options.definitions=[]]
 * @param  {boolean} [options.skipMiddleware=false]
 * @return {Function}
 */
export const Router = (options = {}) => {
  return (target) => {
    classLevelDecoratorChecker(target)

    const metadata = {
      builder: routerOptions.builder,
      router: merge(routerOptions, { router: { ...options } })
    }

    target.$$metadata$$ = merge(target.$$metadata$$ ?? {}, metadata)

    return target
  }
}
