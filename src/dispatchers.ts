import { RouterError } from './errors/RouterError'
import { isFunctionModule, isObjectLikeModule } from '@stone-js/core'
import { DependencyResolver, FunctionalEventHandler, IComponentEventHandler, IEventHandler, IIncomingEvent, MetaComponentEventHandler, MetaEventHandler } from './declarations'

/**
 * Options for dispatching a route handler.
 *
 * @template IncomingEventType - The type representing the incoming event.
 * @template OutgoingResponseType - The type representing the outgoing response.
 */
export interface DispatcherOptions<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType = unknown
> {
  /** The name of the action method in the handler. */
  action?: string

  /** The dependency resolver to use. */
  resolver?: DependencyResolver

  /** The incoming event. */
  event: IncomingEventType

  /** An instance of a handler containing action methods or a callable handler. */
  handler?:
  | IEventHandler<IncomingEventType, OutgoingResponseType>
  | FunctionalEventHandler<IncomingEventType, OutgoingResponseType>
  | MetaEventHandler<IncomingEventType, OutgoingResponseType>
  | MetaComponentEventHandler<IncomingEventType, OutgoingResponseType>
}

/**
 * Dispatches a callable router action.
 *
 * @template IncomingEventType - The type representing the incoming event.
 * @template OutgoingResponseType - The type representing the outgoing response.
 *
 * @param options - The dispatcher options, including event and handler.
 * @returns A promise resolving to the outgoing response.
 * @throws {RouterError} If no callable function is found.
 *
 * @example
 * ```typescript
 * await callableDispatcher({
 *   event,
 *   handler: async (context) => { return new OutgoingResponse('Success') }
 * });
 * ```
 */
export async function callableDispatcher<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType = unknown
> ({ event, handler }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> {
  if (isFunctionModule<FunctionalEventHandler<IncomingEventType, OutgoingResponseType>>(handler)) {
    return await handler(event)
  }

  throw new RouterError('No callable function found')
}

/**
 * Dispatch event to a handler action.
 *
 * @template IncomingEventType - The type representing the incoming event.
 * @template OutgoingResponseType - The type representing the outgoing response.
 *
 * @param options - The dispatcher options, including event, action, and handler.
 * @returns A promise resolving to the outgoing response.
 * @throws {RouterError} If the action is not found in the handler.
 *
 * @example
 * ```typescript
 * await handlerDispatcher({
 *   event,
 *   action: 'handleRequest',
 *   handler: new MyController(),
 * });
 * ```
 */
export async function handlerDispatcher<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType = unknown
> ({ event, handler, action }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> {
  if (isObjectLikeModule<IEventHandler<IncomingEventType, OutgoingResponseType>>(handler) && action !== undefined && action in handler) {
    return await handler[action](event)
  }

  throw new RouterError(`Action ${String(action)} not found in handler`)
}

/**
 * Dispatches a component router action.
 *
 * @template IncomingEventType - The type representing the incoming event.
 * @template OutgoingResponseType - The type representing the outgoing response.
 *
 * @param options - The dispatcher options, including event, options, and handler.
 * @returns A promise resolving to the outgoing response.
 * @throws {RouterError} If no component is found.
 *
 * @example
 * ```typescript
 * await componentDispatcher({
 *   options,
 * });
 * ```
 */
export async function componentDispatcher<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType = unknown
> ({ handler }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> {
  if (isObjectLikeModule<IComponentEventHandler<IncomingEventType, OutgoingResponseType>>(handler)) {
    return handler as OutgoingResponseType
  }

  throw new RouterError('No component found')
}
