/**
 * Class representing a CallableDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class CallableDispatcher {
  /**
   * Dispatch.
   *
   * @param {IncomingEvent} event
   * @param {Route}    route
   * @param {Function} callable
   *
   * @return {any}
   */
  dispatch (event, route, callable) {
    const params = route.parametersWithoutNulls()

    /** @type {EventContext} */
    const context = {
      event,
      route,
      params,
      request: event,
      parameters: params,
      body: event.body ?? {},
      query: event.query ?? {},
      payload: event.body ?? {}
    }

    return callable(context)
  }
}
