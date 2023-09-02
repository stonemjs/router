import { HostMatcher } from "./matchers/HostMatcher.mjs"
import { MethodMatcher } from "./matchers/MethodMatcher.mjs"
import { ProtocolMatcher } from "./matchers/ProtocolMatcher.mjs"
import { UriMatcher } from "./matchers/UriMatcher.mjs"

export class Route {
  constructor ({
    name,
    path,
    rules,
    domain,
    action,
    method,
    methods,
    fallback,
    children,
    policies,
    validators,
    middleware,
  }) {
    this.hash = ''
    this.query = {}
    this.params = {}
    this.name = name
    this.path = path
    this.rules = rules
    this.action = action
    this.method = method
    this.domain = domain
    this.methods = methods
    this.fallback = fallback
    this.children = children
    this.policies = policies
    this.validators = validators
    this.middleware = middleware

    this._router = null
    this._matchers = null
    this._container = null
  }

  matches (request, includingMethod = true) {
    const matchers = this.getMatchers().filter(matcher => !(!includingMethod && matcher instanceof MethodMatcher))
    for (const matcher of matchers) {
      if (!matcher.matches(this, request)) {
        return false
      }
    }
    return true
  }

  getMatchers () {
    return this._matchers ?? this._getDefaultMatchers()
  }

  setMatchers (matchers) {
    this._matchers = matchers
    return this
  }

  run () {
    
  }

  runController () {}

  runCallable () {}

  getMethods () {
    this.methods = this.methods ?? []
    return this.methods.concat(this.method ? [this.method] : [])
  }

  _getDefaultMatchers () {
    return [
      HostMatcher,
      MethodMatcher,
      ProtocolMatcher,
      UriMatcher,
    ]
  }
}