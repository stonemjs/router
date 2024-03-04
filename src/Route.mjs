import { RouteDefinition } from './RouteDefinition.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { RouteParameterBinder } from './RouteParameterBinder.mjs'
import { LogicException, isPlainObject, isFunction, isClass } from '@stone-js/common'

export class Route {
  #router
  #matchers
  #protocol
  #container
  #parameters
  #definition
  #dispatchers

  static pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\}?$/
  static domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\})?(.+)$/

  static create (routeDefinition) {
    return new this(routeDefinition)
  }

  constructor (routeDefinition) {
    if (!(routeDefinition instanceof RouteDefinition)) {
      throw new LogicException("This method's parameter must be an instance of `RouteDefinition`")
    }

    this.#matchers = []
    this.#dispatchers = {}
    this.#definition = routeDefinition
  }

  get uri () {
    return `${this.domain ?? ''}${this.path}`
  }

  get path () {
    return `/${this.get('path', '').trim()}`.replaceAll(/\/+/g, '/')
  }

  get domain () {
    return this.get('domain')?.replace(/^https?:\/\//, '') ?? null
  }

  get methods () {
    return this.#definition.getMethods()
  }

  get action () {
    return this.get('action')
  }

  get name () {
    return this.get('name')
  }

  get rules () {
    return this.get('rules', {})
  }

  get defaults () {
    return this.get('defaults', {})
  }

  get isFallback () {
    return this.get('fallback', false)
  }

  get middleware () {
    return this.get('middleware', [])
  }

  get excludeMiddleware () {
    return this.get('excludeMiddleware', [])
  }

  get (key, fallback = null) {
    return this.#definition.get(key, fallback)
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

  run (request) {
    if (this.isBrowser()) {
      return this.#runComponent(request)
    } else if (this.isControllerAction()) {
      return this.#runController(request)
    } else if (this.isCallableAction()) {
      return this.#runCallable(request)
    } else {
      throw new LogicException('Invalid action provided.')
    }
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
    return Object.fromEntries(Object.entries(this.parameters()).filter(([, value]) => value != null))
  }

  parameterNames () {
    this._parameterNames ??= this.#compileParameterNames()
    return this._parameterNames
  }

  optionalParameterNames () {
    const constraints = this.#uriConstraints()
    return this
      .parameterNames()
      .filter(param => constraints.find(v => v.param === param)?.optional)
  }

  isParameterNameOptional (name) {
    return this.optionalParameterNames().includes(name)
  }

  addDefault (name, value) {
    this.#definition.add('defaults', { [name]: value }, false)
    return this
  }

  getDefault (name) {
    return this.#definition.get('defaults', {})[name]
  }

  addRule (name, value) {
    this.#definition.add('rules', { [name]: value }, false)
    return this
  }

  addRules (rules) {
    Object.entries(rules).forEach(([name, rule]) => this.addRule(name, rule))
    return this
  }

  getRule (name, fallback = '[^/]+?') {
    return this.#definition.get('rules', {})[name] ?? fallback
  }

  hasDomain () {
    return !!this.domain
  }

  isSecure () {
    return this.#protocol === 'https'
  }

  isHttpOnly () {
    return this.#protocol === 'http'
  }

  isHttpsOnly () {
    return this.isSecure()
  }

  getActionType () {
    return isFunction(this.action) ? 'Closure' : 'Controller'
  }

  isBrowser () {
    return typeof window === 'object'
  }

  getComponent () {
    if (this.isBrowser()) {
      return this.action
    }

    throw new LogicException('Component action must be called only on browser context.')
  }

  isCallableAction () {
    return isFunction(this.action)
  }

  getCallable () {
    if (this.isCallableAction()) {
      return this.action
    }

    throw new LogicException('Callable action must be a function')
  }

  isControllerAction () {
    return isPlainObject(this.action) && isClass(Object.values(this.action).pop())
  }

  getController () {
    if (!this._controller) {
      if (this.isControllerAction()) {
        const Class = Object.values(this.action)[0]
        this._controller = this.#container ? this.#container.make(Class) : new Class()
      } else {
        throw new LogicException('The controller must be a class')
      }
    }

    return this._controller
  }

  getControllerMethod () {
    if (this.isControllerAction()) {
      return Object.keys(this.action)[0]
    } else {
      throw new LogicException("The controller action must be a string, representing the controller's method.")
    }
  }

  getControllerActionFullname (separator = '@') {
    const entries = Object.entries(this.action)
    return [entries[1].name, entries[0]].join(separator)
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
    return this.#matchers?.length > 0
  }

  getMatchers () {
    return this.#matchers
  }

  setMatchers (matchers) {
    this.#matchers = matchers
    return this
  }

  addMatchers (matcher) {
    this.#matchers?.push(matcher)
    return this
  }

  getDispatchers () {
    return this.#dispatchers
  }

  getDispatcher (type) {
    return this.getDispatchers()[type]
  }

  hasDispatcher (type) {
    return !!this.getDispatcher(type)
  }

  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))
    return this
  }

  addDispatcher (type, dispatcher) {
    if (!['component', 'callable', 'controller'].includes(type)) {
      throw new LogicException(`Invalid dispatcher type ${type}. Valid types are 'component', 'callable' and 'controller'`)
    }
    this.#dispatchers[type] = dispatcher
    return this
  }

  uriRegex (flag = 'i') {
    const domain = this.domain ? this.#buildDomainRegex(this.#getDomainConstraints()) : ''
    const path = this.#getPathConstraints().reduce((prev, curr) => `${prev}${this.#buildSegmentRegex(curr)}`, '')
    return new RegExp(`^${domain}${path.length ? path : '\/\/?'}$`, flag)
  }

  pathRegex (flag = 'i') {
    const pattern = this.#getPathConstraints().reduce((prev, curr) => `${prev}${this.#buildSegmentRegex(curr)}`, '')
    return new RegExp(`^${pattern.length ? pattern : '\/'}\/?$`, flag)
  }

  domainRegex (flag = 'i') {
    const pattern = this.domain ? this.#buildDomainRegex(this.#getDomainConstraints()) : null
    return pattern ? new RegExp(`^${pattern}$`, flag) : null
  }

  #buildDomainRegex (value) {
    if (!value.param) { return value.suffix }
    return value.optional
      ? `(${value.rule})?${value.suffix}`
      : `(${value.rule})${value.suffix}`
  }

  #buildSegmentRegex (value = null) {
    if (!value) {
      return '\/'
    }

    if (!value.param) {
      return `\/${value.match}`
    }

    if (value.prefix) {
      switch (value.quantifier) {
        case '?':
          return `\/${value.prefix}(${value.rule})?`
        case '+':
          return `\/${value.prefix}((?:${value.rule})(?:\/(?:${value.rule}))*)`
        case '*':
          return `\/${value.prefix}((?:${value.rule})(?:\/(?:${value.rule}))*)?`
        default:
          return `\/${value.prefix}(${value.rule})`
      }
    }

    switch (value.quantifier) {
      case '?':
        return `(?:\/(${value.rule}))?`
      case '+':
        return `\/((?:${value.rule})(?:\/(?:${value.rule}))*)`
      case '*':
        return `(?:\/((?:${value.rule})(?:\/(?:${value.rule}))*))?`
      default:
        return `\/(${value.rule})`
    }
  }

  #uriConstraints () {
    return [].concat(this.#getDomainConstraints(), this.#getPathConstraints())
  }

  #getDomainConstraints () {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'suffix']
    this._domainConstraints ??= this
      .getDomain()
      ?.match(Route.domainConstraintRegex)
      ?.filter((_, i) => i < 6)
      ?.reduce((prev, curr) => ({ ...prev, [keys[i]]: curr }), {})
    
    if (this._domainConstraints.param) {
      this._domainConstraints.rule ??= this.getRule(this._domainConstraints.param)
      this._domainConstraints.default ??= this.getDefault(this._domainConstraints.param)
      this._domainConstraints.optional = /^[?*]$/.test(this._domainConstraints.quantifier)
    }

    return this._domainConstraints
  }

  #getPathConstraints () {
    this._pathConstraints ??= this
      .path
      .split('/')
      .filter(segment => segment.trim().length)
      .map(segment => {
        if (segment.includes(':')) {
          const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier']
          return segment
            .match(Route.pathConstraintRegex)
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
    return this._pathConstraints
  }

  #compileParameterNames () {
    return this.
      #uriConstraints()
      .filter(v => v.param)
      .map(v => v.param)
  }

  #runComponent (request) {
    return this.#componentDispatcher().dispatch(request, this, this.getComponent())
  }

  #componentDispatcher () {
    if (this.hasDispatcher('component')) {
      const Class = this.getDispatcher('component')
      return this.#container ? this.#container.make(Class) : new Class()
    }

    throw new LogicException('No component dispatcher provided.')
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
      methods: this.methods,
      action: this.isControllerAction() ? this.getControllerActionFullname() : this.getActionType(),
      rules: this.rules ?? 'Empty',
      defaults: this.defaults ?? 'Empty',
      domain: this.domain ?? 'Empty',
      fallback: this.fallback ?? false,
      middleware: this.middleware?.map(v => v.name) ?? 'Empty',
      excludeMiddleware: this.excludeMiddleware?.map(v => v.name) ?? 'Empty'
    }
  }

  toString () {
    return JSON.stringify(this.toJSON())
  }
}
