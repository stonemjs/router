import deepmerge from 'deepmerge'
import { routerOptions } from '@stone-js/router/config'
import { classLevelDecoratorChecker } from '@stone-js/common'

/**
 * Decorators, usefull for decorating classes.
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
 * @param  {Object} options - The decorator configuration options.
 * @param  {Object} [options.router={}]
 * @param  {Object} [options.router.rules={}]
 * @param  {number} [options.router.maxDepth=5]
 * @param  {string} [options.router.prefix=null]
 * @param  {Object} [options.router.defaults={}]
 * @param  {boolean} [options.router.strict=false]
 * @param  {Object} [options.router.dispatchers={}]
 * @param  {Function[]} [options.router.matchers=[]]
 * @param  {Function[]} [options.router.middleware=[]]
 * @param  {definition[]} [options.router.definitions=[]]
 * @param  {boolean} [options.router.skipMiddleware=false]
 * @return {Function}
 */
export const Router = (options = {}) => {
  return (target) => {
    classLevelDecoratorChecker(target)

    const metadata = {
      router: deepmerge(routerOptions, { router: { ...options } })
    }

    target.$$metadata$$ = deepmerge(target.$$metadata$$ ?? {}, metadata)

    return target
  }
}
