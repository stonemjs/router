import * as pipes from './pipes.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { LogicException } from '@stone-js/common'
import { RouteDefinition } from '../RouteDefinition.mjs'

export class FlattenMapper {
  #maxDepth

  constructor ({ maxDepth } = {}) {
    this.#maxDepth = maxDepth ?? 5
  }

  setMaxDepth (value) {
    this.#maxDepth = value
    return this
  }

  flattenMap (definitions) {
    return this._validate(
      definitions.reduce((prev, definition) => this._flatten(prev, definition, definition.children), [])
    )
  }

  _validate (definitions) {
    return definitions.reduce((prev, definition) => {
      if (!definition.path) {
        throw new LogicException(`No Path provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.method && !definition.methods) {
        throw new LogicException(`No Methods provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.action) {
        throw new LogicException(`No Action provided for this route definition ${JSON.stringify(definition)}`)
      } else {
        return prev.concat(new RouteDefinition(definition))
      }
    }, [])
  }

  _flatten (flattened, definition, children = null, depth = 0) {
    if ((definition.action || definition.actions) && (!children || this._isBrowser())) {
      flattened.push(definition)
    }

    if (Array.isArray(children)) {
      depth++
      for (const child of children) {
        if (depth >= this.#maxDepth) {
          throw new LogicException(`Route definition depth exeeceded the limit value (${this.#maxDepth})`)
        }
        this._flatten(flattened, this._prepend(definition, child), child.children, depth)
      }
    }

    return flattened
  }

  _prepend (parent, child) {
    return Pipeline
      .create()
      .sync()
      .send(parent, child)
      .through(Object.values(pipes))
      .then((_, definition) => definition)
  }

  _isBrowser () {
    return typeof window === 'object'
  }
}
