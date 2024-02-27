import { MetaResponse, LogicException } from '@stone-js/common'

export const isClass = (value) => {
  return /^\s*class/.test(value.toString())
}

export const isMethod = (value) => {
  return !isClass(value) && typeof value === 'function'
}

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
