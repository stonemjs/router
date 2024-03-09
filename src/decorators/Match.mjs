import deepmerge from 'deepmerge'
import { MetaProperty } from './MetaProperty.mjs'
import { LogicException, isClass, isMethod } from '@stone-js/common'

export const Match = (definition) => {
  return (target, name, descriptor) => {
    
    if (!isClass(target) && !isMethod(descriptor.value)) {
      throw new LogicException('This decorator can only be applied at method level')
    }

    const metadata = {
      decorators: {
        route: { ...definition, method: null }
      }
    }

    const originalMethod = descriptor.value
    metadata.decorators.route.action = { [name]: target }

    if (originalMethod instanceof MetaProperty) {
      descriptor.value = new MetaProperty(
        originalMethod.getAction(),
        deepmerge(originalMethod.getMetadata(), metadata)
      )
    } else {
      descriptor.value = new MetaProperty(originalMethod, metadata)
    }

    return descriptor
  }
}
