import { Route } from "./Route.mjs"

export class RouteCollection {
  #routes = new Map()

  constructor () {
    
  }

  add (name, route) {
    this.#routes.set(name, route)
  }
}