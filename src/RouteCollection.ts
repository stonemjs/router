import { Route } from "./Route";
import { HTTP_METHODS } from "./constants";
import { RouteNotFoundError } from "./errors/RouteNotFoundError";
import { IIncomingEvent, IOutgoingResponse } from "./declarations";
import { MethodNotAllowedError } from "./errors/MethodNotAllowedError";

export class RouteCollection <
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  private readonly routes: Map<string, Route<IncomingEventType, OutgoingResponseType>> = new Map();
  private readonly nameList: Map<string, Route<IncomingEventType, OutgoingResponseType>> = new Map();
  private readonly methodList: Map<string, Map<string, Route<IncomingEventType, OutgoingResponseType>>> = new Map();

  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
  >(routes?: Route<IncomingEventType, OutgoingResponseType>[]): RouteCollection<IncomingEventType, OutgoingResponseType> {
    return new this(routes);
  }

  constructor(routes?: Route<IncomingEventType, OutgoingResponseType>[]) {
    if (Array.isArray(routes)) {
      routes.forEach(route => this.add(route));
    }
  }

  /**
   * Adds a route instance to the collection.
   *
   * @param route - The route to add.
   * @returns The updated RouteCollection instance.
   */
  public add(route: Route<IncomingEventType, OutgoingResponseType>): this {
    this.addToCollections(route);
    this.addToMethodList(route);
    this.addToNameList(route);
    return this;
  }

  /**
   * Matches a route based on the given event.
   *
   * @param event - The incoming event to match.
   * @param includingMethod - Whether to include HTTP method in the match (default: true).
   * @returns The matched route or throws an error.
   */
  public match(event: IncomingEventType, includingMethod: boolean = true): Route<IncomingEventType, OutgoingResponseType> {
    const routes = this.getByMethod(event.method);
    const route = this.matchAgainstRoutes(routes, event, includingMethod);
    return this.handleMatchedRoute(event, route);
  }

  /**
   * Checks if a named route exists in the collection.
   *
   * @param name - The name of the route.
   * @returns True if the named route exists, false otherwise.
   */
  public hasNamedRoute(name: string): boolean {
    return this.nameList.has(name);
  }

  /**
   * Retrieves a route by its name.
   *
   * @param name - The name of the route.
   * @returns The corresponding route or undefined.
   */
  public getByName(name: string): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return this.nameList.get(name);
  }

  /**
   * Retrieves routes by HTTP method.
   *
   * @param method - The HTTP method.
   * @returns An array of routes matching the method.
   */
  public getByMethod(method: string): Route<IncomingEventType, OutgoingResponseType>[] {
    return Array.from(this.methodList.get(method.toUpperCase())?.values() ?? []);
  }

  /**
   * Retrieves all registered routes as an array.
   *
   * @returns An array of all routes.
   */
  public getRoutes(): Route<IncomingEventType, OutgoingResponseType>[] {
    return Array.from(this.routes.values());
  }

  /**
   * Retrieves routes grouped by HTTP method as a Map.
   *
   * @returns A Map of routes grouped by method.
   */
  public getRoutesByMethod(): ReadonlyMap<string, Map<string, Route<IncomingEventType, OutgoingResponseType>>> {
    return this.methodList;
  }

  /**
   * Retrieves routes grouped by name as a Map.
   *
   * @returns A Map of routes grouped by name.
   */
  public getRoutesByName(): ReadonlyMap<string, Route<IncomingEventType, OutgoingResponseType>> {
    return this.nameList;
  }

  /**
   * Dumps all routes as an array of JSON objects.
   *
   * @returns An array of route definitions.
   */
  public dump(): Record<string, unknown>[] {
    return Array.from(this.methodList.entries())
      .reduce<Record<string, string>[]>((prev, [method, routeMap]) => {
        return prev.concat(
          Array.from(routeMap.values())
            .filter(route => !(method === 'HEAD' && route.getOption<boolean>('isInternalHeader', false) === true))
            .map(route => {
              const json = { ...route.toJSON(), method };
              return json;
            })
        );
      }, [])
      .sort((a, b) => a.path?.localeCompare(b.path));
  }

  /**
   * Converts all routes to a JSON array.
   *
   * @returns An array of JSON objects representing the routes.
   */
  public toJSON(): Record<string, unknown>[] {
    return this.getRoutes().map(route => route.toJSON());
  }

  /**
   * Converts all routes to a JSON string.
   *
   * @returns A JSON string representing all routes.
   */
  public toString(): string {
    return JSON.stringify(this.toJSON());
  }

  private addToCollections(route: Route<IncomingEventType, OutgoingResponseType>): void {
    this.routes.set(`${String(route.getOption('method'))}.${String(route.getOption('path'))}`, route);
  }

  private addToNameList(route: Route<IncomingEventType, OutgoingResponseType>): void {
    const name = route.getOption<string>('name')
    name !== undefined && this.nameList.set(name, route);
  }

  private addToMethodList(route: Route<IncomingEventType, OutgoingResponseType>): void {
    const path = route.getOption<string>('path')
    const method = route.getOption<string>('method')

    if (method !== undefined && path !== undefined) {
      !this.methodList.has(method) && this.methodList.set(method, new Map());
      this.methodList.get(method)?.set(path, route);
    }
  }

  private matchAgainstRoutes(
    routes: Route<IncomingEventType, OutgoingResponseType>[],
    event: IncomingEventType,
    includingMethod: boolean
  ): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return routes
      .sort((a, b) => Number(a.getOption<boolean>('fallback')) - Number(b.getOption<boolean>('fallback')))
      .find(route => route.matches(event, includingMethod));
  }

  private handleMatchedRoute(event: IncomingEventType, route?: Route<IncomingEventType, OutgoingResponseType>): Route<IncomingEventType, OutgoingResponseType> {
    if (route !== undefined) return route;

    const others = this.checkForAlternateVerbs(event);

    if (others.length > 0) return this.getRouteForMethods(event, others);

    throw new RouteNotFoundError(`Route ${String(event.decodedPathname)} could not be found.`);
  }

  private checkForAlternateVerbs(event: IncomingEventType): string[] {
    return HTTP_METHODS.filter(
      method =>
        method.toUpperCase() !== event.method?.toUpperCase() &&
        this.matchAgainstRoutes(this.getByMethod(method), event, false) !== undefined
    );
  }

  private getRouteForMethods(event: IncomingEventType, methods: string[]): Route<IncomingEventType, OutgoingResponseType> {
    if (event.isMethod?.('OPTIONS')) {
      return new Route({
        method: 'OPTIONS',
        path: event.decodedPathname,
        action: () => ({
          statusText: '',
          statusCode: 200,
          content: { Allow: methods.join(',') },
        }),
      });
    }

    throw new MethodNotAllowedError(`Method ${String(event.method)} is not supported for ${String(event.decodedPathname)}. Supported methods: ${String(methods.join(', '))}.`);
  }

  public get size(): number {
    return this.getRoutes().length;
  }

  public [Symbol.iterator](): Iterator<Route<IncomingEventType, OutgoingResponseType>> {
    let index = -1;
    const routes = this.getRoutes();

    return {
      next: (): IteratorResult<Route<IncomingEventType, OutgoingResponseType>> => ({
        value: routes[++index],
        done: !(index in routes),
      }),
    };
  }
}
