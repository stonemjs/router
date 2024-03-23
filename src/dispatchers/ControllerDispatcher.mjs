/**
 * Class representing a ControllerDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ControllerDispatcher {
  /**
   * Dispatch.
   *
   * @param {external:Request} request
   * @param {Route}   route
   * @param {any}     controller
   * @param {String}  method
   *
   * @return {any}
   */
  dispatch (request, route, controller, method) {
    const params = route.parametersWithoutNulls()
    const context = {
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {}
    }

    if (controller.callAction) {
      return controller.callAction(method, context)
    }

    return controller[method](context)
  }
}
