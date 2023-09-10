export class ControllerDispatcher {
  #container

  constructor ({
    container
  }) {
    this.#container = container
  }

  dispatch (route, controller, method) {
    const params = {
      route,
      container: this.#container,
      request: this.#getRequest(),
      params: route.parametersWithoutNulls(),
      parameters: route.parametersWithoutNulls()
    }

    if (controller.callAction) {
      return controller.callAction(method, params)
    }

    return controller[method](params)
  }

  #getRequest () {
    return this.#container.make('request')
  }
}
