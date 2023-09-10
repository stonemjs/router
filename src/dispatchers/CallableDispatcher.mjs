export class CallableDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (route, callable) {
    const request = this.#getRequest()
    const params = route.parametersWithoutNulls() ?? {}

    return callable({
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {},
      container: this.#container
    })
  }

  #getRequest () {
    return this.#container.make('request')
  }
}
