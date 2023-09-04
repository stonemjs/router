export class RouteDefinition {
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
    this.action = action
    this.method = method
    this.domain = domain
    this.methods = methods
    this.fallback = fallback
    this.defaults = defaults
    this.middleware = middleware
  }
}