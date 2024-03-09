export class MetaProperty {
  #action
  #metadata

  constructor (action, metadata) {
    this.#action = action
    this.#metadata = metadata
  }

  invokeAction (...args) {
    return this.#action(...args)
  }

  getAction () {
    return this.#action
  }

  getMetadata () {
    return this.#metadata ?? {}
  }

  getDecorators () {
    return this.getMetadata().decorators ?? {}
  }

  getRouteDecorator () {
    return this.getDecorators().route
  }
}
