import { Router, RouterOptions } from './Router'
import { Container } from '@stone-js/service-container'
import { IIncomingHttpEvent, IOutgoingResponse } from './declarations'

export function routerResolver<U extends IIncomingHttpEvent, V extends IOutgoingResponse> (container: Container): Router<U, V> {
  return Router.create(container.make<RouterOptions>('container'))
}
