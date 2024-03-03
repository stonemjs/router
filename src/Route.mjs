import { RouteDefinition } from './RouteDefinition.mjs'
import { LogicException, isString } from '@stone-js/common'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { RouteParameterBinder } from './RouteParameterBinder.mjs'

export class Route {
  #path
  #router
  #action
  #methods
  #matchers
  #protocol
  #metadata
  #container
  #controller
  #parameters
  #dispatchers
  #parsedDomain
  #parameterNames
  #parsedSegments

  static pathRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\}?$/
  static domainRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\})?(.+)$/

  static fromRouteDefinition (routeDefinition) {
    if (routeDefinition instanceof RouteDefinition) {
      return new this({ ...routeDefinition })
    }

    throw new LogicException("This method's parameter must be an instance of `RouteDefinition`")
  }

  constructor ({
    path,
    name,
    rules,
    domain,
    action,
    method,
    methods,
    fallback,
    defaults,
    metadata,
    middleware,
    excludeMiddleware
  }) {
    this.name = name
    this.#path = path
    this.domain = domain
    this.rules = rules ?? {}
    this.defaults = defaults ?? {}
    this.#metadata = metadata ?? {}
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

  get methods () {
    return this.getMethods()
  }

  get action () {
    return this.#action
  }

  get fullUri () {
    return this.getFullUri()
  }

  get path () {
    const trimmedUri = this.#path.trim()
    return trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`
  }

  bind (request) {
    this.#protocol = request.protocol
    this.#parameters = RouteParameterBinder.getParameters(this, request)
    return this
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

  async run (request) {
    if (!this.#container) {
      console.log('No service container provided')
    }

    try {
      if (this.isControllerAction()) {
        return await this.#runController(request)
      }
      return await this.#runCallable(request)
    } catch (error) {
      if (!error.getResponse) {
        throw new LogicException("Controller or callable's Exception must contain a `getResponse` method.")
      }
      return error.getResponse()
    }
  }

  getMethods () {
    return this.#methods ?? []
  }

  setMethods (value) {
    this.#methods ??= []

    if (Array.isArray(value)) {
      this.#methods = value
    } else if (isString(value)) {
      this.#methods.push(value)
    } else {
      this.#methods.push('GET')
    }

    if (this.#methods.includes('GET')) { this.#methods.push('HEAD') }

    this.#methods = this.#methods.reduce((prev, curr) => prev.concat(!prev.includes(curr) ? curr.toUpperCase() : []), [])

    return this
  }

  hasParameters () {
    return !!this.#parameters
  }

  hasParameter (name) {
    return this.hasParameters() && !!this.#parameters[name]
  }

  parameters () {
    if (this.hasParameters()) {
      return this.#parameters
    }

    throw new LogicException('Route is not bound')
  }

  parameter (name, fallback = null) {
    return this.parameters()[name] ?? fallback
  }

  setParameter (name, value) {
    this.parameters()[name] = value
    return this
  }

  deleteParameter (name) {
    delete this.parameters()[name]
    return this
  }

  parametersWithoutNulls () {
    return Object.fromEntries(Object.entries(this.parameters()).filter(([, value]) => !!value))
  }

  parameterNames () {
    this.#parameterNames ??= this.#compileParameterNames()
    return this.#parameterNames
  }

  optionalParameterNames () {
    const domainAndSegments = this.#getParsedDomainAndSegments()
    return this
      .parameterNames()
      .filter(param => domainAndSegments.find(v => v.param === param)?.optional)
  }

  isParameterNameOptional (name) {
    return this.optionalParameterNames().includes(name)
  }

  setDefault (name, value) {
    this.defaults ??= {}
    this.defaults[name] = value
    return this
  }

  getDefault (name) {
    return this.defaults[name]
  }

  setRule (name, value) {
    this.rules ??= {}
    this.rules[name] = value
    return this
  }

  addRules (rules) {
    Object.entries(rules).forEach(([name, rule]) => this.setRule(name, rule))
    return this
  }

  getRule (name, fallback = '[^/]+?') {
    return this.rules[name] ?? fallback
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

  isCallableAction () {
    return typeof this.#action === 'function'
  }

  getController () {
    if (!this.#controller) {
      if (this.isControllerAction()) {
        const Class = this.#action[0]
        this.#controller = this.#container ? this.#container.make(Class) : new Class()
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

  getControllerActionFullname (separator = '@') {
    return [this.#action[0].name, this.#action[1]].join(separator)
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

  getFullUri () {
    return `${this.getDomain() ?? ''}${this.path}`
  }

  pathRegex (flag = 'gi') {
    const pattern = this
      .#getParsedSegments()
      .reduce((prev, curr) => `${prev}${this.#getSegmentRegex(curr)}`, '')
    return new RegExp(`^${pattern.length ? pattern : '\/\/?'}$`, flag)
  }

  domainRegex (flag = 'gi') {
    const pattern = this.getDomain() ? this.#getDomainRegex(this.#getParsedDomain()) : null
    return pattern ? new RegExp(`^${pattern}$`, flag) : null
  }

  domainAndUriRegex (flag = 'gi') {
    const domain = this.getDomain() ? this.#getDomainRegex(this.#getParsedDomain()) : ''
    const path = this
      .#getParsedSegments()
      .reduce((prev, curr) => `${prev}${this.#getSegmentRegex(curr)}`, '')
    return new RegExp(`^${domain}${path.length ? path : '\/\/?'}$`, flag)
  }

  #getDomainRegex (value) {
    if (!value.param) {
      return value.suffix
    }

    switch (value.quantifier) {
      case '?':
        return `(${value.rule})?${value.suffix}`
      default:
        return `(${value.rule})${value.suffix}`
    }
  }

  #getSegmentRegex (value = null) {
    if (!value) {
      return '\/\/?'
    }

    if (!value.param) {
      return `\/${value.match}\/?`
    }

    if (value.prefix) {
      switch (value.quantifier) {
        case '?':
          return `\/${value.prefix}(${value.rule})?\/?`
        case '+':
          return `\/${value.prefix}((?:${value.rule})(?:\/(?:${value.rule}))*)\/?`
        case '*':
          return `\/${value.prefix}((?:${value.rule})(?:\/(?:${value.rule}))*)?\/?`
        default:
          return `\/${value.prefix}(${value.rule})\/?`
      }
    }

    switch (value.quantifier) {
      case '?':
        return `(?:\/(${value.rule}))?\/?`
      case '+':
        return `\/((?:${value.rule})(?:\/(?:${value.rule}))*)\/?`
      case '*':
        return `(?:\/((?:${value.rule})(?:\/(?:${value.rule}))*))?\/?`
      default:
        return `\/(${value.rule})\/?`
    }
  }

  #compileParameterNames () {
    return this.
      #getParsedDomainAndSegments()
      .filter(v => v.param)
      .map(v => v.param)
  }

  #getParsedDomainAndSegments () {
    return [].concat(this.#getParsedDomain(), this.#getParsedSegments())
  }

  #getParsedDomain () {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'suffix']
    this.#parsedDomain ??= this
      .getDomain()
      ?.match(Route.domainRegex)
      ?.reduce((prev, curr, i) => i < 6 ? { ...prev, [keys[i]]: curr } : prev, {})
    
    if (this.#parsedDomain.param) {
      this.#parsedDomain.rule ??= this.getRule(this.#parsedDomain.param)
      this.#parsedDomain.default ??= this.getDefault(this.#parsedDomain.param)
      this.#parsedDomain.optional = /^[?*]$/.test(this.#parsedDomain.quantifier)
    }

    return this.#parsedDomain
  }

  #getParsedSegments () {
    this.#parsedSegments ??= this
      .#path
      .split('/')
      .filter(segment => segment.trim().length)
      .map(segment => {
        if (segment.includes(':')) {
          const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier']
          return segment
            .match(Route.pathRegex)
            .filter((_, i) => i < 6)
            .reduce((prev, curr) => ({ ...prev, [keys[i]]: curr }), {})
        }
        return { match: segment }
      })
      .map(segment => {
        if (segment.param) {
          segment.rule ??= this.getRule(segment.param)
          segment.default ??= this.getDefault(segment.param)
          segment.optional = /^[?*]$/.test(segment.quantifier)
        }
        return segment
      })
    return this.#parsedSegments
  }

  #runCallable (request) {
    return this.#callableDispatcher().dispatch(request, this, this.getCallable())
  }

  #callableDispatcher () {
    if (this.hasDispatcher('callable')) {
      const Class = this.getDispatcher('callable')
      return this.#container ? this.#container.make(Class) : new Class()
    }

    throw new LogicException('No callable dispatcher provided')
  }

  #runController (request) {
    return this.#controllerDispatcher().dispatch(request, this, this.getController(), this.getControllerMethod())
  }

  #controllerDispatcher () {
    if (this.hasDispatcher('controller')) {
      const Class = this.getDispatcher('controller')
      return this.#container ? this.#container.make(Class) : new Class()
    }

    throw new LogicException('No controller dispatcher provided')
  }

  toJSON () {
    return {
      name: this.name ?? 'Empty',
      path: this.path ?? 'Empty',
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
