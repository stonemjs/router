import { Container } from "@noowow-community/service-container"
import middleware from "./middleware/**/*Middleware.mjs"
import controllers from "./controllers/**/*Controller.mjs"
import { Router, RoutingServiceProvider } from "@noowow-community/router"
import EventManager from "../EventManager.mjs"

export const container = new Container()

const services = [
  ...middleware,
  ...controllers
].reduce((prev, curr) => prev.concat(Object.values(curr).filter(v => (v.metadata ?? {}).type === 'service')), [])

// Bind services
container.discovering(services)
container.instance(Container, container)
container.provider(RoutingServiceProvider)
container.singleton('events', () => new EventManager())
container.singleton(EventManager, () => new EventManager())

export const router = container.make(Router)
export const eventManager = container.make(EventManager)


