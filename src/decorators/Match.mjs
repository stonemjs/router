import deepmerge from 'deepmerge'
import { MetaResponse } from '../MetaResponse.mjs'
import { classAndMethodDecoratorException, isClass } from './utils.mjs'

export const Match = (definition) => {
  return (target, name, descriptor) => {
    classAndMethodDecoratorException(target, descriptor.value)

    const metadata = {
      decorators: {
        route: { ...definition, method: null }
      }
    }

    if (isClass(target)) {
      target.metadata = deepmerge(target.metadata ?? {}, metadata)
      return target
    }

    metadata.decorators.route.action = [target.constructor, name]

    if (descriptor.value instanceof MetaResponse) {
      descriptor.value = new MetaResponse(
        descriptor.value.getResponse(),
        deepmerge(descriptor.value.getMetadata(), metadata)
      )
    } else {
      descriptor.value = new MetaResponse(descriptor.value, metadata)
    }

    return descriptor
  }
}
