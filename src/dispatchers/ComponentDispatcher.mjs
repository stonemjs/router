/**
 * Class representing a ComponentDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ComponentDispatcher {
  /**
   * Dispatch.
   *
   * @param {external:Request} request
   * @param {Route}  route
   *
   * @return {any}
   */
  dispatch (request, route) {
    const params = route.parametersWithoutNulls()
    const context = {
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {}
    }

    return {
      context,
      action: route.action,
      actions: route.actions
    }
  }
}
