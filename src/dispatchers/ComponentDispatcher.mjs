/**
 * Class representing a ComponentDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ComponentDispatcher {
  /**
   * Dispatch.
   *
   * @param {IncomingEvent} event
   * @param {Route}  route
   *
   * @return {any}
   */
  dispatch (event, route) {
    const params = route.parametersWithoutNulls()

    /** @type {EventContext} */
    const context = {
      event,
      route,
      params,
      request: event,
      parameters: params,
      query: event.query ?? {}
    }

    return {
      context,
      action: route.action,
      actions: route.actions
    }
  }
}
