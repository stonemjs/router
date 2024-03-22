import { LogicException, isClass, isMethod, MetaProperty } from '@stone-js/common'

/**
 * Match decorator, usefull for decorating controller method for any route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Match = (definition) => {
  return (target, name, descriptor) => {
    if (!isClass(target) || (!isMethod(descriptor.value) && !(descriptor.value instanceof MetaProperty))) {
      throw new LogicException('This decorator can only be applied at method level')
    }

    descriptor.value = new MetaProperty(name, descriptor.value, { decorators: { route: { ...definition, action: { [name]: target }, method: undefined } } })

    return descriptor
  }
}
