export class Route {
  constructor ({
    name,
    path,
    rules,
    method,
    policies,
    validators,
    controller,
    middleware,
  }) {
    this.hash = {}
    this.query = {}
    this.params = {}
    this.name = name
    this.path = path
    this.rules = rules
    this.method = method
    this.policies = policies
    this.validators = validators
    this.controller = controller
    this.middleware = middleware
  }
}