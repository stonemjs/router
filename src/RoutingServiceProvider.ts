import { IContainer } from "./declarations";
import { Router, RouterOptions } from "./Router";
import { RouterError } from "./errors/RouterError";
import { MetaPipe, Pipe, PipeInstance, Pipeline, PipelineOptions } from "@stone-js/pipeline";
import { IncomingEvent, isConstructor, KernelContext, OutgoingResponse } from "@stone-js/core";

/**
 * RoutingServiceProviderOptions options.
 */
export interface RoutingServiceProviderOptions {
  container: IContainer;
}

/**
 * Class representing a RoutingServiceProvider.
 * Responsible for registering router components and dispatchers into the service container.
 * Also provides hooks for lifecycle events like termination.
 * 
 * @author
 * Mr. Stone <evensstone@gmail.com>
 */
export class RoutingServiceProvider<
  IncomingEventType extends IncomingEvent = IncomingEvent,
  OutgoingResponseType extends OutgoingResponse = OutgoingResponse
> {
  private readonly container: IContainer;

  /**
   * Create a new instance of RoutingServiceProvider.
   *
   * @param container - The service container instance.
   */
  constructor({ container }: RoutingServiceProviderOptions) {
    if (container === undefined) { throw new RouterError('Container is required to create a RoutingServiceProvider instance'); }

    this.container = container;
  }

  /**
   * Registers router components in the service container.
   *
   * @returns `void`
   */
  public register(): void {
    this.registerRouter()
  }

  /**
   * Registers the router in the service container.
   *
   * @returns The current instance for chaining.
   */
  private registerRouter(): void {
    this.container
      .singletonIf(Router, container => Router.create(container.make<RouterOptions>('container')))
      .alias(Router, 'router')
  }

  /**
   * Hook that runs just before or just after returning the response.
   * Useful for performing cleanup tasks.
   * Invokes router and current route terminate middlewares.
   */
  public async onTerminate(): Promise<void> {
    const router = this.container.make<Router>(Router);

    if (router !== undefined) {
      const route = router.getCurrentRoute();
      const event = this.container.has('event') ? this.container.make<IncomingEventType>('event') : undefined;
      const response = this.container.has('response') ? this.container.make<OutgoingResponseType>('response') : undefined;
  
      const terminateMiddleware = (route !== undefined ? router.gatherRouteMiddleware(route) : [])
        .filter((middleware) => {
          const pipe: Function | undefined = typeof (middleware as MetaPipe).pipe === 'function'
            ? (middleware as MetaPipe).pipe as Function
            : (typeof middleware === 'function' ? middleware : undefined)
          return typeof pipe?.prototype?.terminate === 'function'
        })
  
      if (terminateMiddleware.length > 0) {
        const pipelineOptions = this.makePipelineOptions() as PipelineOptions<Partial<KernelContext<IncomingEventType, OutgoingResponseType>>, OutgoingResponseType>

        await Pipeline
          .create<Partial<KernelContext<IncomingEventType, OutgoingResponseType>>, OutgoingResponseType>(pipelineOptions)
          .send({ event, response })
          .via('terminate')
          .through(terminateMiddleware)
          .thenReturn()
      }
    }
  }

  /**
   * Creates pipeline options for the Kernel.
   *
   * @protected
   * @returns The pipeline options for configuring middleware.
   */
  private makePipelineOptions (): PipelineOptions<KernelContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType> {
    return {
      resolver: (middleware: Pipe) => {
        if (isConstructor(middleware)) {
          return this.container.resolve<PipeInstance<KernelContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType>>(middleware, true)
        }
      }
    }
  }
}
