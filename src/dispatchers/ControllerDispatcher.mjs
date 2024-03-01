/**
 * Class representing a ControllerDispatcher.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 * 
 * @external Container
 * @see {@link https://github.com/stonemjs/service-container/blob/main/src/Container.mjs|Container}
 * 
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class ControllerDispatcher {
  #container

  /**
   * Create a controllerDispatcher.
   *
   * @param {Container} container
   */
  constructor ({
    container
  }) {
    this.#container = container
  }

  /**
   * Dispatch.
   *
   * @param {Request} request
   * @param {Route}   route
   * @param {any}     controller
   * @param {String}  method
   * 
   * @return {any}
   */
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
