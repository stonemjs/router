import { Route } from "./Route.mjs"

export class RouteThree extends Route {
  constructor (params) {
    super(params)
    this.children = params.children
  }
}