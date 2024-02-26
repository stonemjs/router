import { METHODS } from "./enums/index.mjs"
import { RouteDefinition } from "./RouteDefinition.mjs"
import { LogicException } from "./exceptions/LogicException.mjs"

export class RouteDefinitionParser {
  #maxDepth

  constructor({ maxDepth = 5 }) {
    this.#maxDepth = maxDepth ?? 5
  }

  parse(definitions) {
    return this.#validate(
      definitions.reduce((prev, curr) => this.#flatten(prev, curr, curr.children), [])
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
    child = this.#appendPath(parent, child)
    child = this.#appendName(parent, child)
    child = this.#appendRules(parent, child)
    child = this.#appendDomain(parent, child)
    child = this.#appendMethods(parent, child)
    child = this.#appendActions(parent, child)
    child = this.#appendDefaults(parent, child)
    child = this.#appendBindings(parent, child)
    child = this.#appendArrayProp(parent, child)

    return this.#appendAction(parent, child)
  }

  #appendPath (parent, child) {
    child.path = `${parent.path ?? ''}/${child.path ?? ''}`.replace(/\/+/g, '/')
    return child
  }

  #appendName (parent, child) {
    child.name = `${parent.name ?? ''}.${child.name ?? ''}`.replace(/\.+/g, '/')
    return child
  }

  #appendDomain (parent, child) {
    child.domain ??= parent.domain
    return child
  }

  #appendMethods (parent, child) {
    child.methods = []
      .concat(parent.methods, parent.method, child.methods, child.method)
      .reduce((prev, method) => !METHODS.includes(method) || prev.includes(method) ? prev : prev.concat(method), [])
    return child
  }

  #appendArrayProp (parent, child) { // For middleware, throttle and any other custom array props
    const props = []
      .concat(Object.keys(parent), Object.keys(child))
      .filter(v => !['methods', 'alias', 'children'].includes(v) && (Array.isArray(parent[v]) || Array.isArray(child[v])))
    
    for (const prop of props) {
      child[prop] = []
        .concat(parent[prop], child[prop])
        .reduce((prev, item) => !item || prev.includes(item) ? prev : prev.concat(item), [])
    }

    return child
  }

  #appendBindings (parent, child) {
    child.bindings = { ...parent.bindings, ...child.bindings }
    return child
  }

  #appendRules(parent, child) {
    child.rules = { ...parent.rules, ...child.rules }
    return child
  }

  #appendDefaults (parent, child) {
    child.defaults = { ...parent.defaults, ...child.defaults }
    return child
  }

  #appendActions (parent, child) {
    child.actions = { ...parent.actions, ...child.actions }
    return child
  }

  #appendAction (parent, child) {
    if (!child.action && parent.action) {
      child._action = parent.action // Deep down action to children
    }

    if (typeof child.action === 'string' && /^\s*class/.test((parent.action ?? parent._action ?? '').toString())) {
      child.action = { [child.action]: parent.action }
    }

    return child
  }
}