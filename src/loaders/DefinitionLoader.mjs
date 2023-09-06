import { RouteDefinition } from "../RouteDefinition.mjs"
import { LogicException } from "../exceptions/LogicException.mjs"

export class DefinitionLoader {
  #rawDefinitions
  #flattenDefinitions

  constructor(rawDefinitions) {
    this.#flattenDefinitions = []
    this.#rawDefinitions = rawDefinitions
  }

  load () {
    return this
      ._flattenDefinition(this.#rawDefinitions)
      ._validateDefinitions()
      ._getDefinitions()
  }

  _getDefinitions () {
    return this.#flattenDefinitions.map(definition => new RouteDefinition(definition))
  }

  _validateDefinitions () {
    return this._getDefinitions().reduce((prev, definition) => {
      if (!definition.uri) {
        throw new LogicException(`No Uri provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.method && !definition.methods) {
        throw new LogicException(`No Methods provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.action) {
        throw new LogicException(`No Action provided for this route definition ${JSON.stringify(definition)}`)
      }

      return prev
    }, this)
  }

  _flattenDefinition (definition, parent = null) {
    if (parent) {
      definition.uri = this._flattenUri(definition, parent)
      definition.name = this._flattenName(definition, parent)
      definition.rules = this._flattenRules(definition, parent)
      definition.action = this._flattenAction(definition, parent)
      definition.domain = this._flattenDomain(definition, parent)
      definition.methods = this._flattenMethods(definition, parent)
      definition.defaults = this._flattenDefaults(definition, parent)
      definition.middleware = this._flattenMiddleware(definition, parent)
    }

    if (definition.children) {
      for (const child of definition.children) {
        this._flattenDefinition(child, definition)
      }
      return this
    }

    this.#flattenDefinitions.push(definition)
    
    return this
  }

  _flattenUri (definition, parent) {
    return (parent.uri && definition.uri)
      ? `${parent.uri}${definition.uri}`
      : (parent.uri ?? definition.uri)
  }

  _flattenDomain (definition, parent) {
    return parent.domain && !definition.domain ? parent.domain : definition.domain
  }

  _flattenAction (definition, parent) {
    const parentAction = Array.isArray(parent.action) ? parent.action[0] : parent.action
    const definitionAction = Array.isArray(definition.action) ? definition.action[0] : definition.action

    if (typeof definitionAction === 'string' && parentAction && /^\s*class/.test(parentAction.toString())) {
      return [parentAction, definitionAction]
    }

    return definition.action ?? parent.action
  }

  _flattenName (definition, parent) {
    return (parent.name && definition.name)
      ? `${parent.name}.${definition.name}`
      : (parent.name ?? definition.name)
  }

  _flattenRules (definition, parent) {
    return Object
      .entries(parent.rules ?? {})
      .reduce((prev, [key, rule]) => {
        if (!prev[key]) {
          if (
            definition.children ||
            this._keyExistsInUri(parent.uri, key) ||
            this._keyExistsInUri(definition.uri, key)
          ) {
            prev[key] = rule
          }
        }
        return prev
      }, definition.rules ?? {})
  }

  _flattenDefaults (definition, parent) {
    return Object
      .entries(parent.defaults ?? {})
      .reduce((prev, [key, value]) => {
        if (!prev[key]) {
          if (
            definition.children ||
            this._keyExistsInUri(parent.uri, key) ||
            this._keyExistsInUri(definition.uri, key)
          ) {
            prev[key] = value
          }
        }
        return prev
      }, definition.defaults ?? {})
  }

  _flattenMethods (definition, parent) {
    return [
      ...(parent.methods ?? []),
      ...(definition.methods ?? []),
      ...(parent.method ? [parent.method] : []),
      ...(definition.method ? [definition.method] : []),
    ].reduce((prev, method) => prev.includes(method) ? prev : prev.concat([method]), [])
  }

  _flattenMiddleware (definition, parent) {
    return [
      ...(parent.middleware ?? []),
      ...(definition.middleware ?? []),
    ].reduce((prev, middleware) => prev.includes(middleware) ? prev : prev.concat([middleware]), [])
  }

  _keyExistsInUri (uri, key) {
    return new RegExp(`\/(:(${key})|\\{(${key})\\})`, 'gm').test(uri)
  }
}