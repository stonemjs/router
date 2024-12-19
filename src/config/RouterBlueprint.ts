import { routerResolver } from "../resolvers";
import { MixedPipe } from "@stone-js/pipeline";
import { AppConfig, StoneBlueprint } from "@stone-js/core";
import { RoutingServiceProvider } from "../RoutingServiceProvider";
import { routeConfigMiddleware } from "../middleware/configMiddleware";
import { IDispachers, IMatcher, RouteDefinition } from "../declarations";
import { RouterHandlerMiddleware } from "../middleware/RouterHandlerMiddleware";

export interface RouterConfig {
  prefix?: string;
  strict: boolean;
  maxDepth: number;
  matchers: IMatcher[];
  middleware: MixedPipe[];
  skipMiddleware: boolean;
  dispatchers: IDispachers;
  rules: Record<string, RegExp>;
  definitions: RouteDefinition[];
  defaults: Record<string, unknown>;
  bindings: Record<string, Function>;
}

export interface RouterAppConfig extends Partial<AppConfig> {
  router: RouterConfig;
}

export interface RouterBlueprint extends StoneBlueprint {
  stone: RouterAppConfig
}

export const routerBlueprint: RouterBlueprint = {
  stone: {
    builder: {
      middleware: routeConfigMiddleware
    },
    kernel: {
      routerResolver,
    },
    router: {
      rules: {},
      strict: false,
      maxDepth: 5,
      defaults: {},
      bindings: {},
      matchers: [],
      prefix: undefined,
      middleware: [
        { pipe: RouterHandlerMiddleware, priority: 100 }
      ],
      definitions: [],
      dispatchers: {},
      skipMiddleware: false,
    },
    providers: [
      RoutingServiceProvider
    ],
  }
}