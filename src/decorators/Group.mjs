import { classLevelDecoratorChecker, merge } from '@stone-js/common'

/**
 * Group decorator, Useful for decorating controller class for group route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Group = (definition = {}) => {
  return (target) => {
    classLevelDecoratorChecker(target)

    const metadata = {
      routeGroup: {
        ...definition,
        action: undefined,
        actions: undefined
      }
    }

    target.$$metadata$$ = merge(target.$$metadata$$ ?? {}, metadata)

    return target
  }
}
