import { Container } from "@noowow-community/service-container"
import middleware from "./middleware/**/*Middleware.mjs"
import controllers from "./controllers/**/*Controller.mjs"
import { Router } from "@noowow-community/router"
import EventManager from "../EventManager.mjs"

export const container = new Container()
export const eventManager = new EventManager()
export const router = new Router({
  container,
  eventManager,
})

const services = [
  ...middleware,
  ...controllers
].reduce((prev, curr) => prev.concat(Object.values(curr).filter(v => (v.metadata ?? {}).type === 'service')), [])

  // Bind services
container.discovering(services)
container.instance(Router, router)
container.instance(Container, container)
container.instance(EventManager, eventManager)
