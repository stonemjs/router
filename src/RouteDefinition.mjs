export class RouteDefinition {
  constructor ({
    uri,
    name,
    rules,
    domain,
    action,
    methods,
    fallback,
    defaults,
    middleware,
    excludeMiddleware
  }) {
    this.uri = uri
    this.name = name
    this.rules = rules
    this.action = action
    this.domain = domain
    this.methods = methods
    this.fallback = fallback
    this.defaults = defaults
    this.middleware = middleware
    this.excludeMiddleware = excludeMiddleware
  }
}
