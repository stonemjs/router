import { Router } from './Router.mjs'
import { Provider } from '@noowow-community/service-container'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'

export class RoutingServiceProvider extends Provider {
  register () {
    this
      .#registerRouter()
      .#registerDispatchers()
  }

  #registerRouter () {
    const resolver = container => new Router({ container, eventManager: container.bound('events') ? container.make('events') : null })
    this
      .container
      .singleton(Router, resolver)
      .singleton('router', resolver)

    return this
  }

  #registerDispatchers () {
    this
      .container
      .singleton(CallableDispatcher, container => new CallableDispatcher({ container }))
      .singleton(ControllerDispatcher, container => new ControllerDispatcher({ container }))

    return this
  }
}
