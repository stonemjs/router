import * as pipes from './pipes.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { RouteDefinition } from './RouteDefinition.mjs'
import { LogicError, isBrowser } from '@stone-js/common'

/**
 * Class representing a FlattenMapper.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class FlattenMapper {
  #maxDepth

  /**
   * Create a FlattenMapper.
   *
   * @param {number} maxDepth
   */
  constructor (maxDepth = 5) {
    this.#maxDepth = maxDepth ?? 5
  }

  /**
   * Set MaxDepth.
   *
   * @param   {number} maxDepth
   * @returns {this}
   */
  setMaxDepth (value) {
    this.#maxDepth = value
    return this
  }

  /**
   * Flat map raw defintions to RouteDefinition.
   *
   * @param   {definition[]} definitions
   * @returns {RouteDefinition[]}
   */
  flattenMap (definitions) {
    return this._validate(
      definitions.reduce((prev, definition) => this._flatten(prev, definition, definition.children), [])
    )
  }

  /**
   * Validate route definitions
   * Some definition options are required
   * Like `path`, `action` and `method` or `methods`.
   *
   * @param   {definition[]} definitions
   * @returns {RouteDefinition[]}
   */
  _validate (definitions) {
    return definitions.reduce((prev, definition) => {
      if (!definition.path) {
        throw new TypeError(`No Path provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.method && !definition.methods) {
        throw new TypeError(`No Methods provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.action) {
        throw new TypeError(`No Action provided for this route definition ${JSON.stringify(definition)}`)
      } else {
        return prev.concat(new RouteDefinition(definition))
      }
    }, [])
  }

  /**
   * Flatten route defintions recursively.
   *
   * @param   {definition[]} flattened
   * @param   {definition} definition
   * @param   {definition[]} children
   * @param   {number} [depth=0]
   * @returns {definition[]}
   */
  _flatten (flattened, definition, children = null, depth = 0) {
    if ((definition.action || definition.actions) && (!children || isBrowser())) {
      flattened.push(definition)
    }

    if (Array.isArray(children)) {
      depth++
      for (const child of children) {
        if (depth >= this.#maxDepth) {
          throw new LogicError(`Route definition depth exeeceded the limit value (${this.#maxDepth})`)
        }
        this._flatten(flattened, this._prepend(definition, child), child.children, depth)
      }
    }

    return flattened
  }

  /**
   * Merge parent with child.
   *
   * @param   {definition} parent
   * @param   {definition[]} child
   * @returns {definition[]}
   */
  _prepend (parent, child) {
    return Pipeline
      .create()
      .sync()
      .send(parent, child)
      .through(Object.values(pipes))
      .then((_, definition) => definition)
  }
}
