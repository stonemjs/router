export class ControllerDispatcher {
  constructor ({
    request,
    container
  }) {
    this._request = request
    this._container = container
  }

  dispatch (route, controller, method) {
    const params = {
      route,
      request: this._request,
      container: this._container,
      parameters: route.parametersWithoutNulls()
    }

    if (controller.callAction) {
      return controller.callAction(method, params)
    }

    return controller[method](params)
  }
}
