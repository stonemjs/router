import deepmerge from "deepmerge"
import { MetaResponse } from "../MetaResponse.mjs"
import { LogicException } from "../exceptions/LogicException.mjs"

const isClass = (value) => {
  return /^\s*class/.test(value.toString())
}

const isMethod = (value) => {
  return !isClass(value) && typeof value === 'function'
}

export const Match = (definition) => {
  return (target, name, descriptor) => {
    if (
      !isClass(target) ||
      !isMethod(descriptor.value) ||
      !(descriptor.value instanceof MetaResponse)
    ) {
      throw new LogicException('This decorator can only be applied at method or class level')
    }

    const metadata = {
      name,
      decorators: {
        route: { ...definition, method: null }
      }
    }

    if (isClass(target)) {
      target.metadata = deepmerge(target.metadata ?? {}, metadata)
      return target
    }

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