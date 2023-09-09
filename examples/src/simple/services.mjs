import { Container } from "@noowow-community/service-container"
import { Router } from "@noowow-community/router"
import EventManager from "../EventManager.mjs"

export const container = new Container()
export const eventManager = new EventManager()
export const router = new Router({
  container,
  eventManager,
})

container.instance(Router, router)
container.instance(Container, container)
container.instance(EventManager, eventManager)