export class CallableDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (route, callable) {
    return callable({
      route,
      container: this.#container,
      request: this.#getRequest(),
      params: route.parametersWithoutNulls(),
      parameters: route.parametersWithoutNulls()
    })
  }

  #getRequest () {
    return this.#container.make('request')
  }
}
