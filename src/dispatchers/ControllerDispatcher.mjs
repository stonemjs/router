export class ControllerDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (route, controller, method) {
    const request = this.#getRequest()
    const params = route.parametersWithoutNulls() ?? {}
    const context = {
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {},
      container: this.#container
    }

    if (controller.callAction) {
      return controller.callAction(method, context)
    }

    return controller[method](context)
  }

  #getRequest () {
    return this.#container.make('request')
  }
}
