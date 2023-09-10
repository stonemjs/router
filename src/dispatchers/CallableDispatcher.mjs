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
      parameters: route.parametersWithoutNulls()
    })
  }

  #getRequest () {
    return this.#container.make('request')
  }
}
