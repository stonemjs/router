import { LogicException, isClass, isMethod, MetaResponse } from '@stone-js/common'

export const classAndMethodDecoratorException = (Class, method) => {
  if (
    !isClass(Class) ||
    !isMethod(method) ||
    !(method instanceof MetaResponse)
  ) {
    throw new LogicException('This decorator can only be applied at method or class level')
  }
}

export const filterByKeys = (obj, keys) => {
  return Object.fromEntries(Object.entries(obj ?? {}).filter(([key]) => keys.includes(key)))
}
