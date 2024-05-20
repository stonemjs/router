import { MetaProperty } from '@stone-js/common'

/**
 * Event context.
 *
 * @typedef  {Object} EventContext
 * @property {IncomingEvent} event - Incomming event.
 * @property {IncomingEvent} request - Event alias.
 * @property {Route} route - Current route.
 * @property {Object} params - Current route params.
 * @property {Object} parameters - Params alias.
 * @property {Object} [body] - Event body.
 * @property {Object} [payload] - Body alias.
 * @property {URLSearchParams} query - Event query params.
 */

/**
 * Class representing a ControllerDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ControllerDispatcher {
  /**
   * Dispatch.
   *
   * @param {IncomingEvent} event
   * @param {Route}   route
   * @param {any}     controller
   * @param {String}  method
   *
   * @return {any}
   */
  async dispatch (event, route, controller, method) {
    let response
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

    if (controller.callAction) {
      response = await controller.callAction(method, context)
    } else {
      response = await controller[method](context)
    }

    if (response instanceof MetaProperty) {
      response = await response.invoke(controller, context)
    }

    return response
  }
}
