import { LogicException, isClass, isMethod, MetaProperty } from '@stone-js/common'

export const Match = (definition) => {
  return (target, name, descriptor) => {
    if (!isClass(target) || (!isMethod(descriptor.value) && !(descriptor.value instanceof MetaProperty))) {
      throw new LogicException('This decorator can only be applied at method level')
    }

    descriptor.value = new MetaProperty(name, descriptor.value, { decorators: { route: { ...definition, action: { [name]: target }, method: undefined } } })

    return descriptor
  }
}
