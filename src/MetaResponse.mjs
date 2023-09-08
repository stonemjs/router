export class MetaResponse {
  #response
  #metadata

  constructor (response, metadata) {
    this.#response = response
    this.#metadata = metadata
  }

  getResponse () {
    return this.#response
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
