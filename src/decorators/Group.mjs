import deepmerge from 'deepmerge'
import { LogicException, isClass } from '@stone-js/common'

export const Group = (definition) => {
  return (target) => {
    if (!isClass(target)) {
      throw new LogicException('This decorator can only be applied at class level')
    }

    const metadata = {
      decorators: {
        route: {
          ...definition,
          actions: null,
          action: null
        }
      }
    }

    target.metadata = deepmerge(target.metadata ?? {}, metadata)
    return target
  }
}
