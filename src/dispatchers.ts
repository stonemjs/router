import { Route } from './Route'
import { RouterError } from './errors/RouterError'
import { IControllerInstance, IDispacher, IIncomingEvent, IOutgoingResponse, RouterActionContext, RouterCallableAction } from './declarations'

/**
 * Options for dispatching a route handler.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 */
export interface DispatcherOptions<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> {
  /** The name of the handler method in the controller. */
  handler?: string

  /** The incoming HTTP event. */
  event: IncomingEventType

  /** A callable action used for route handling. */
  callable?: RouterCallableAction

  /** An instance of a controller containing handler methods. */
  controller?: IControllerInstance

  /** The matched route for the current request. */
  route: Route<IncomingEventType, OutgoingResponseType>
}

/**
 * Dispatches a callable router action.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The dispatcher options, including event, route, and callable action.
 * @returns A promise resolving to the outgoing HTTP response.
 * @throws {RouterError} If no callable function is found.
 *
 * @example
 * ```typescript
 * await callableDispatcher({
 *   event,
 *   route,
 *   callable: async (context) => { return new OutgoingResponse('Success') }
 * });
 * ```
 */
export const callableDispatcher: IDispacher = async <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, callable }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType | unknown> => {
  const params = route.getDefinedParams()
  const context: RouterActionContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: route.query
  }

  if (typeof callable === 'function') {
    return callable(context)
  }

  throw new RouterError('No callable function found')
}

/**
 * Dispatches a controller action by invoking a specific handler method.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The dispatcher options, including event, route, controller, and handler.
 * @returns A promise resolving to the outgoing HTTP response.
 * @throws {RouterError} If the handler is not found in the controller.
 *
 * @example
 * ```typescript
 * await controllerDispatcher({
 *   event,
 *   route,
 *   controller: new MyController(),
 *   handler: 'handleRequest'
 * });
 * ```
 */
export const controllerDispatcher: IDispacher = async <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, controller, handler }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType | unknown> => {
  const params = route.getDefinedParams()
  const context: RouterActionContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: route.query
  }

  if (controller !== undefined && handler !== undefined && handler in controller) {
    return controller[handler](context)
  }

  throw new RouterError(`Handler ${String(handler)} not found in controller`)
}
