export class CallableDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (request, route, callable) {
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
}
