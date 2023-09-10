import { RouteParameterBinder } from './RouteParameterBinder.mjs'
import { RouteDefinition } from './RouteDefinition.mjs'
import { LogicException } from './exceptions/LogicException.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'

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

    throw new LogicException("This method's parameter must be an instance of `RouteDefinition`")
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

  async run () {
    if (!this.#container) {
      throw new LogicException('No service container provided')
    }

    try {
      if (this.isControllerAction()) {
        return await this.#runController()
      }
      return await this.#runCallable()
    } catch (error) {
      console.log('error--', error)
      if (!error.getResponse) {
        throw new LogicException("Controller or callable's Exception must contain a `getResponse` method.")
      }
      return error.getResponse()
    }
  }

  get methods () {
    return this.getMethods()
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

  parameterNameRegex (type = 'default', value = '\\w+', flag = 'gi') {
    return {
      required: new RegExp(`\\/?(:(${value})|\\{(${value})\\})\\/?`, flag),
      optional: new RegExp(`\\/?(:(${value})\\?|\\{(${value})\\?\\})\\/?`, flag),
      default: new RegExp(`\\/?(:(${value})\\??|\\{(${value})\\??\\})\\/?`, flag)
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

    if (!(this.isControllerAction() || this.isCallableAction())) {
      throw new LogicException(`Invalid action {${action}}. Must provide an action for route`)
    }

    return this
  }

  getActionType () {
    return Array.isArray(this.#action) ? 'Controller' : 'Closure'
  }

  getCallable () {
    if (this.isCallableAction()) {
      return this.#action
    }

    throw new LogicException('Callable action must be a function')
  }

  getController () {
    if (!this.#controller) {
      if (this.isControllerAction()) {
        this.#controller = this.#container.make(this.#action[0])
      } else {
        throw new LogicException('First value of action must be a class')
      }
    }

    return this.#controller
  }

  getControllerMethod () {
    if (this.isControllerAction() && typeof this.#action?.[1] === 'string') {
      return this.#action[1]
    } else {
      throw new LogicException('Second value of action must be the controller method and must be as string')
    }
  }

  isControllerAction () {
    return Array.isArray(this.#action) && /^\s*class/.test(this.#action[0]?.toString())
  }

  isCallableAction () {
    return typeof this.#action === 'function'
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

  hasMatchers () {
    return this.#matchers.length > 0
  }

  getMatchers () {
    return this.#matchers
  }

  setMatchers (matchers) {
    this.#matchers = matchers
    return this
  }

  addMatchers (matcher) {
    this.#matchers.push(matcher)
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

  get fullUri () {
    return this.getFullUri()
  }

  getFullUri () {
    return `${this.getDomain() ?? ''}${this.uri}`
  }

  uriRegex (flag = 'gi') {
    return this.#regex(this.uri, flag)
  }

  domainRegex (flag = 'gi') {
    return this.getDomain() ? this.#regex(this.getDomain(), flag) : null
  }

  domainAndUriRegex (flag = 'gi') {
    return this.#regex(this.getFullUri(), flag)
  }

  #regex (value, flag = 'gi') {
    const pattern = this
      .parameterNames()
      .reduce((prev, name) => {
        const isOpt = this.isParameterNameOptional(name)
        const val = isOpt ? `:${name}?` : `:${name}`
        const val2 = isOpt ? `{${name}?}` : `{${name}}`
        const replace = `(${this.getRule(name, isOpt ? /\w*/ : /\w+/)})`
        return prev.replaceAll(val, replace).replaceAll(val2, replace)
      }, value.startsWith('/') ? value : `/${value}`)

    return new RegExp(`^${pattern}\\/?$`, flag)
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

  #callableDispatcher () {
    if (this.hasDispatcher('callable')) {
      return this.#container.make(this.getDispatcher('callable'))
    }

    throw new LogicException('No callable dispatcher provided')
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

  getControllerActionFullname (separator = '@') {
    return [this.#action[0].name, this.#action[1]].join(separator)
  }

  toJSON () {
    return {
      name: this.name ?? 'Empty',
      uri: this.uri ?? 'Empty',
      methods: this.getMethods(),
      method: this.getMethods()[0],
      action: this.isControllerAction() ? this.getControllerActionFullname() : this.getActionType(),
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
