import * as pipes from './pipes.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { LogicException } from '@stone-js/common'
import { RouteDefinition } from '../RouteDefinition.mjs'

export class RouteDefinitionParser {
  #maxDepth

  constructor ({ maxDepth = 5 }) {
    this.#maxDepth = maxDepth ?? 5
  }

  parse (definitions) {
    return this.#validate(
      definitions.reduce((prev, definition) => this.#flatten(prev, definition, definition.children), [])
    )
  }

  #validate (definitions) {
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

  #flatten (flattened, definition, children = null, depth = 0) {
    if (definition.action || definition.actions) {
      flattened.push(definition)
    }

    if (Array.isArray(children)) {
      for (const child of children) {
        if (depth >= this.#maxDepth) {
          throw LogicException(`Route definition depth exeeceded the limit value (${this.#maxDepth})`)
        }

        flattened = flattened.concat(this.#flatten(flattened, this.#append(definition, child), child.children, ++depth))
      }
    }

    return flattened
  }

  #append (parent, child) {
    return Pipeline
      .create()
      .send(parent, child)
      .through(Object.values(pipes))
      .then((_, definition) => definition)
  }
}
