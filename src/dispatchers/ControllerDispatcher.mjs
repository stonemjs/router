export class ControllerDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (request, route, controller, method) {
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
}
