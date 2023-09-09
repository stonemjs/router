import { RouteParameterBinder } from './RouteParameterBinder.mjs'
import { RouteDefinition } from './RouteDefinition.mjs'
import { LogicException } from './exceptions/LogicException.mjs'
import { HostMatcher } from './matchers/HostMatcher.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { ProtocolMatcher } from './matchers/ProtocolMatcher.mjs'
import { UriMatcher } from './matchers/UriMatcher.mjs'

export class Route {
  #router
  #action
  #methods
  #matchers
  #protocol
  #container
  #controller
  #parameters
  #dispatchers
  #parameterNames

  constructor ({
    uri,
    name,
    rules,
    domain,
    action,
    method,
    methods,
    fallback,
    defaults,
    middleware,
    excludeMiddleware
  }) {
    this.uri = uri
    this.name = name
    this.domain = domain
    this.rules = rules ?? {}
    this.defaults = defaults ?? {}
    this.fallback = fallback ?? false
    this.middleware = middleware ?? []
    this.excludeMiddleware = excludeMiddleware ?? []

    this
      .setMethods(method)
      .setMethods(methods)
      .setAction(action)

    this.#matchers = []
    this.#dispatchers = {}
  }

  static fromRouteDefinition (routeDefinition) {
    if (routeDefinition instanceof RouteDefinition) {
      return new this({ ...routeDefinition })
    }

    throw new LogicException('routeDefinition must be an instance of `RouteDefinition`')
  }

  bind (requestContext) {
    this.#protocol = requestContext.protocol
    this.#parameters = RouteParameterBinder.getParameters(this, requestContext)

    return this
  }

  matches (requestContext, includingMethod = true) {
    const matchers = this.getMatchers().filter(matcher => !(!includingMethod && matcher instanceof MethodMatcher))
    for (const matcher of matchers) {
      if (!matcher.matches(this, requestContext)) {
        return false
      }
    }
    return true
  }

  getMatchers (orDefault = true) {
    return this.hasMatchers() ? this.#matchers : (orDefault ? this.#getDefaultMatchers() : {})
  }

  hasMatchers () {
    return this.#matchers?.length > 0
  }

  setMatchers (matchers, mergeWithDefault = true) {
    this.#matchers = [].concat(mergeWithDefault ? this.#getDefaultMatchers() : [], matchers)
    return this
  }

  run () {
    if (!this.#container) {
      throw new LogicException('No service container provided')
    }

    try {
      if (this.#isControllerAction()) {
        return this.#runController()
      }
      return this.#runCallable()
    } catch (error) {
      console.log('error', error)
      if (!error.getResponse) {
        throw new LogicException("Controller or callable's Exception must contain a `getResponse` method.")
      }
      return error.getResponse()
    }
  }

  getCallable () {
    if (this.#isCallable()) {
      return this.#action
    }

    throw new LogicException('Action must be a function')
  }

  isControllerClass () {
    return this.#action?.[0] && /^\s*class/.test(this.#action[0].toString())
  }

  getController () {
    if (!this.#controller) {
      if (this.#isControllerAction() && this.isControllerClass()) {
        this.#controller = this.#container.make(this.#action[0])
      } else {
        throw new LogicException('First value of action must be a class')
      }
    }

    return this.#controller
  }

  getControllerMethod () {
    if (this.#isControllerAction() && typeof this.#action[1] === 'string') {
      return this.#action[1]
    } else {
      throw new LogicException('Second value of action must be the controller method')
    }
  }

  get methods () {
    return this.#methods ?? []
  }

  getMethods () {
    return this.#methods ?? []
  }

  setMethods (value) {
    this.#methods = this.#methods ?? []

    if (Array.isArray(value)) {
      this.#methods = value
    } else if (typeof value === 'string') {
      this.#methods.push(value)
    } else {
      this.#methods.push('GET')
    }

    if (this.#methods.includes('GET')) { this.#methods.push('HEAD') }

    this.#methods = this.#methods.reduce((prev, curr) => prev.concat(!prev.includes(curr) ? [curr.toUpperCase()] : []), [])

    return this
  }

  hasParameters () {
    return !!this.#parameters
  }

  hasParameter (name) {
    return this.hasParameters() && !!this.#parameters[name]
  }

  parameter (name, fallback = null) {
    return this.#parameters()[name] ?? fallback
  }

  setParameter (name, value) {
    this.#parameters()[name] = value

    return this
  }

  deleteParameter (name) {
    delete this.#parameters()[name]
  }

  parameters () {
    if (this.hasParameters()) {
      return this.#parameters
    }

    throw new LogicException('Route is not bound')
  }

  parametersWithoutNulls () {
    return Object.fromEntries(Object.entries(this.#parameters).filter(([, value]) => !!value))
  }

  parameterNames () {
    if (!this.#parameterNames) {
      this.#parameterNames = this.#compileParameterNames()
    }

    return this.#parameterNames
  }

  optionalParameterNames () {
    return this
      .parameterNames()
      .filter(v => this.parameterNameRegex('optional', v).test(this.getFullUri()))
  }

  isParameterNameOptional (name) {
    return this.optionalParameterNames().includes(name)
  }

  parameterNameRegex (type = 'default', value = '\\w+', flag = 'gm') {
    return {
      required: new RegExp(`\\/(:(${value})|\\{(${value})\\})\\/`, flag),
      optional: new RegExp(`\\/(:(${value})\\?|\\{(${value})\\?\\})\\/`, flag),
      default: new RegExp(`\\/(:(${value})\\??|\\{(${value})\\??\\})`, flag)
    }[type]
  }

  setDefault (name, value) {
    this.defaults = this.defaults ?? {}
    this.defaults[name] = value

    return this
  }

  getDefault (name) {
    return this.defaults[name]
  }

  setRule (name, value) {
    this.rules = this.rules ?? {}
    this.rules[name] = value

    return this
  }

  getRule (name, defaultRule = /\w+/) {
    const rule = this.rules[name] ?? defaultRule
    if (!(rule instanceof RegExp)) {
      throw new LogicException(`This rule ${rule} must be a RegExp`)
    }
    return rule.toString().replace(/^\/|\/$/g, '')
  }

  getDomain () {
    return this.domain ? this.domain.replace(/^https?:\/\//, '') : null
  }

  hasDomain () {
    return !!this.getDomain()
  }

  isHttpOnly () {
    return this.#protocol === 'http'
  }

  isHttpsOnly () {
    return this.isSecure()
  }

  isSecure () {
    return this.#protocol === 'https'
  }

  get action () {
    return this.#action
  }

  getAction () {
    return this.#action
  }

  setAction (action) {
    this.#action = action

    if (!(this.isControllerClass() || this.#isCallable())) {
      throw new LogicException(`Invalid action {${action}}. Must provide an action for route`)
    }

    return this
  }

  getActionType () {
    return Array.isArray(this.#action) ? 'Controller' : 'Closure'
  }

  getRouter () {
    return this.#router
  }

  setRouter (router) {
    this.#router = router

    return this
  }

  setContainer (container) {
    this.#container = container

    return this
  }

  hasDispatcher (type) {
    return !!this.getDispatcher(type)
  }

  getDispatcher (type) {
    return this.getDispatchers()[type]
  }

  getDispatchers () {
    return this.#dispatchers
  }

  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))
    return this
  }

  addDispatcher (type, dispatcher) {
    if (!['callable', 'controller'].includes(type)) {
      throw new LogicException(`Invalid dispatcher type ${type}. Valid types are 'callable' and 'controller'`)
    }
    this.#dispatchers[type] = dispatcher
    return this
  }

  getFullUri () {
    return `${this.getDomain() ?? ''}${this.uri}`
  }

  uriRegex (flag = 'gm') {
    return this.#regex(this.uri, flag)
  }

  domainRegex (flag = 'gm') {
    return this.getDomain() ? this.#regex(this.getDomain(), flag) : null
  }

  domainAndUriRegex (flag = 'gm') {
    return this.#regex(this.getFullUri(), flag)
  }

  #regex (value, flag = 'gm') {
    return new RegExp(
      this
        .parameterNames()
        .reduce((prev, name) => {
          const isOpt = this.isParameterNameOptional(name)
          const regex = this.parameterNameRegex(isOpt ? 'optional' : 'required', name)

          const replace = isOpt
            ? `\\?(${this.getRule(name, /\w*/)})\\/?`
            : `(${this.getRule(name)})`

          return prev.replace(regex, replace)
        }, `^${value}$`),
      flag
    )
  }

  #getDefaultMatchers () {
    return [
      new HostMatcher(),
      new MethodMatcher(),
      new ProtocolMatcher(),
      new UriMatcher()
    ]
  }

  #compileParameterNames () {
    let matchers
    const names = []
    const regex = this.parameterNameRegex()

    while ((matchers = regex.exec(this.getFullUri())) !== null) {
      if (matchers.index === regex.lastIndex) { regex.lastIndex++ } // This is necessary to avoid infinite loops with zero-width matches
      matchers[0] && names.push(matchers[0].replace(/:|\{|\}|\?|\//gm, ''))
    }

    return names
  }

  #runCallable () {
    return this.#callableDispatcher().dispatch(this, this.getCallable())
  }

  #isCallable () {
    return !this.#isControllerAction() && typeof this.#action === 'function'
  }

  #callableDispatcher () {
    if (this.hasDispatcher('callable')) {
      return this.#container.make(this.getDispatcher('callable'))
    }

    throw new LogicException('No callable dispatcher provided')
  }

  #isControllerAction () {
    return Array.isArray(this.#action)
  }

  #runController () {
    return this.#controllerDispatcher().dispatch(this, this.getController(), this.getControllerMethod())
  }

  #controllerDispatcher () {
    if (this.hasDispatcher('controller')) {
      return this.#container.make(this.getDispatcher('controller'))
    }

    throw new LogicException('No controller dispatcher provided')
  }

  #getControllerActionFullname (separator = '@') {
    return [this.#action[0].name, this.#action[1]].join(separator)
  }

  toJSON () {
    return {
      name: this.name ?? 'Empty',
      uri: this.uri ?? 'Empty',
      methods: this.getMethods(),
      action: this.isControllerClass() ? this.#getControllerActionFullname() : this.getActionType(),
      rules: this.rules ?? 'Empty',
      defaults: this.defaults ?? 'Empty',
      domain: this.getDomain() ?? 'Empty',
      fallback: this.fallback ?? false,
      middleware: this.middleware?.map(v => v.name) ?? 'Empty',
      excludeMiddleware: this.excludeMiddleware?.map(v => v.name) ?? 'Empty'
    }
  }

  toString () {
    return JSON.stringify(this.toJSON())
  }
}
