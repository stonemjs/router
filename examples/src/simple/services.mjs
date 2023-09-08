import { Container } from "@noowow-community/service-container"
import EventManager from "../EventManager.mjs"

export const container = new Container()
export const eventManager = EventManager.getInstance()
export const router = new Router({
  container,
  eventManager,
})