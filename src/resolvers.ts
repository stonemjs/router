import { Router } from './Router'
import { IContainer, IIncomingEvent, IOutgoingResponse } from './declarations'

/**
 * Resolves and returns an instance of the `Router` from the dependency injection container.
 *
 * @template U - The type representing the incoming HTTP event.
 * @template V - The type representing the outgoing HTTP response.
 *
 * @param container - The dependency injection container used to resolve the `Router` instance.
 * @returns An instance of the `Router` configured with the specified types for incoming events and outgoing responses.
 *
 * @example
 * ```typescript
 * const router = routerResolver<IIncomingHttpEvent, IOutgoingResponse>(container);
 * router.handle(event);
 * ```
 */
export function routerResolver<U extends IIncomingEvent, V extends IOutgoingResponse> (container: IContainer): Router<U, V> {
  return container.resolve<Router<U, V>>(Router, true)
}
