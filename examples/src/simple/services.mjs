import { Container } from "@noowow-community/service-container"
import middleware from "./middleware/**/*Middleware.mjs"
import controllers from "./controllers/**/*Controller.mjs"
import { Router, RoutingServiceProvider } from "@noowow-community/router"
import EventEmitter from "../EventEmitter.mjs"

export const container = new Container()

const services = [
  ...middleware,
  ...controllers
].reduce((prev, curr) => prev.concat(Object.values(curr).filter(v => (v.metadata ?? {}).type === 'service')), [])

// Bind services
container.discovering(services)
container.instance(Container, container)
container.provider(RoutingServiceProvider)
container.singleton('events', () => new EventEmitter())
container.singleton(EventEmitter, () => new EventEmitter())

export const router = container.make(Router)
export const eventEmitter = container.make(EventEmitter)


