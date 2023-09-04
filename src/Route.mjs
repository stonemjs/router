import { RouteParameterBinder } from "./RouteParameterBinder.mjs"
import { RouteDefinition } from "./RouteDefinition.mjs"
import { CallableDispatcher } from "./dispatchers/CallableDispatcher.mjs"
import { ControllerDispatcher } from "./dispatchers/ControllerDispatcher.mjs"
import { LogicException } from "./exceptions/LogicException.mjs"
import { HostMatcher } from "./matchers/HostMatcher.mjs"
import { MethodMatcher } from "./matchers/MethodMatcher.mjs"
import { ProtocolMatcher } from "./matchers/ProtocolMatcher.mjs"
import { UriMatcher } from "./matchers/UriMatcher.mjs"

export class Route {
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
  }) {
    this.uri = uri
    this.name = name
    this.rules = rules
    this.domain = domain
    this.fallback = fallback
    this.defaults = defaults
    this.middleware = middleware
    
    this
    .setMethods(method)
    .setMethods(methods)
    .setAction(action)
    
    this._path = null
    this._router = null
    this._methods = null
    this._matchers = null
    this._protocol = null
    this._container = null
    this._controller = null
    this._parameters = null
    this._parameterNames = null
  }

  static fromRouteDefinition (routeDefinition) {
    if (routeDefinition instanceof RouteDefinition) {
      return new this({ ...routeDefinition })
    }

    throw new LogicException('routeDefinition must be an instance of `RouteDefinition`')
  }

  get path () {
    return this._path
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

  addMatchers (matchers) {
    this._matchers = { ...this._getDefaultMatchers(), ...matchers }
    return this
  }

  run () {
    if (!this._container) {
      throw new LogicException('No service container provided')
    }

    try {
      if (this._isControllerAction()) {
        return this._runController()
      }
      return this._runCallable()
    } catch (error) {
      if (!error.getResponse) {
        throw new LogicException("Controller or callable's Exception must contain a `getResponse` method.")
      }
      return error.getResponse()
    }
  }

  _runCallable () {
    return this._callableDispatcher().dispatch(this, this.getCallable())
  }

  getCallable () {
    if (this._isCallable()) {
      return this.action
    }

    throw new LogicException('Action must be a function')
  }

  _isCallable () {
    return !this._isControllerAction() && typeof this.action === 'function'
  }

  _callableDispatcher () {
    return this._container.make(CallableDispatcher)
  }

  _isControllerAction () {
    return Array.isArray(this.action)
  }

  _isControllerClass () {
    return this.action[0] && /^\s*class/.test(this.action[0].toString())
  }

  _runController () {
    return this._controllerDispatcher().dispatch(this, this.getController(), this.getControllerMethod())
  }

  _controllerDispatcher () {
    return this._container.make(ControllerDispatcher)
  }

  getController () {
    if (!this._controller) {
      if (this._isControllerAction() && this._isControllerClass()) {
        this._controller = this._container.make(this.action[0])
      } else {
        throw new LogicException('First value of action must be a class')
      }
    }

    return this._controller
  }

  getControllerMethod () {
    if (this._isControllerAction() && this.action[1]) {
      return this.action[1]
    } else {
      throw new LogicException('Second value of action must be the controller method')
    }
  }

  getMethods () {
    return this._methods ?? []
  }

  setMethods (value) {
    this._methods = this._methods ?? []
    if (Array.isArray(value)) this._methods = value
    else if (typeof value === 'string') this.push(value)
    if (this._methods.includes('GET') && !this._methods.includes('HEAD')) this.push('HEAD')
    
    this._methods = this._methods.map(v => v.toUpperCase())
    
    return this
  }

  bind (requestContext) {
    this._path = requestContext.path
    this._protocol = requestContext.protocol
    this.domain = this.domain ?? requestContext.hostname
    this._parameters = (new RouteParameterBinder(this)).parameters(requestContext)

    return this
  }

  hasParameters () {
    !!this._parameters
  }

  hasParameter (name) {
    return this.hasParameters() && !!this._parameters[name]
  }

  parameter (name, fallback = null) {
    return this._parameters()[name] ?? fallback
  }

  setParameter (name, value) {
    this._parameters()[name] = value
    
    return this
  }

  deleteParameter (name) {
    delete this._parameters()[name]
  }

  parameters () {
    if (this.hasParameters()) {
      return this._parameters
    }

    throw new LogicException('Route is not bound')
  }

  parametersWithoutNulls () {
    return Object.fromEntries(Object.entries(this._parameters).filter(([, value]) => !!value))
  }

  parameterNames () {
    if (!this._parameterNames) {
      this._parameterNames = this._compileParameterNames()
    }

    return this._parameterNames
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
      required: new RegExp(`\/(:(${value})|\\{(${value})\\})\/`, flag),
      optional: new RegExp(`\/(:(${value})\\?|\\{(${value})\\?\\})\/`, flag),
      default: new RegExp(`\/(:(${value})\\??|\\{(${value})\\??\\})`, flag)
    }[type]
  }

  _compileParameterNames () {
    let matchers
    const names = []
    const regex = this.parameterNameRegex()

    while ((matchers = regex.exec(this.getFullUri())) !== null) {
      if (matchers.index === regex.lastIndex) { regex.lastIndex++ } // This is necessary to avoid infinite loops with zero-width matches
      matchers[0] && names.push(matchers[0].replace(/:|\{|\}|\?|\//gm, ''))
    }

    return names
  }

  setDefault (name, value) {
    this.defaults = this.defaults ?? {}
    this.defaults[name] = value
    
    return this
  }

  getDefault (name) {
    return this.defaults[name] ?? null
  }

  setRule (name, value) {
    this.rules = this.rules ?? {}
    this.rules[name] = value
    
    return this
  }

  getRule (name, defaultRule = '\\w+') {
    return this.rules[name] ?? defaultRule
  }

  getDomain () {
    return this.domain ? this.domain.replace(/http[s]?:\/\//, '') : null
  }

  httpOnly () {
    return 'http' === this._protocol
  }

  httpsOnly () {
    return this.secure()
  }

  secure () {
    return 'https' === this._protocol
  }

  setAction (action) {
    if (action && (this._isControllerClass() || this._isCallable())) {
      this.action = action
      return this
    }

    throw new LogicException('Must provide an action for route')
  }

  getActionType () {
    return Array.isArray(this.action) ? 'Controller' : 'Closure'
  }

  setRouter (router) {
    this._router = router
    
    return this
  }

  setContainer (container) {
    this._container = container
    
    return this
  }

  getFullUri () {
    return `${this.getDomain() ?? ''}${this.uri}`
  }

  uriRegex (fullUri = true, flag = 'gm') {
    const value = `^${fullUri ? this.getFullUri() : this.uri}$`
    return new RegExp(
      this
        .parameterNames()
        .reduce((prev, name) => {
          const isOpt = this.isParameterNameOptional(name)
          const regex = this.parameterNameRegex(isOpt ? 'optional' : 'required', name)
          
          const replace = isOpt
            ? `\?(${this.getRule(name, '\\w*')})\/?`
            : `(${this.getRule(name)})`
          
          return prev.replace(regex, replace)
        }, value),
      flag
    )
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