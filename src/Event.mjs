import { AbstractEvent } from '@stone-js/common'

export class Event extends AbstractEvent {
  static ROUTING = 'stonejs@router.routing'
  static ROUTE_MATCHED = 'stonejs@router.route_matched'
}
