import { AbstractEvent } from '@stone-js/common'

export class Event extends AbstractEvent {
  static ROUTING = 'stonejs@router.routing'
  static ROUTE_MATCHED = 'stonejs@router.route_matched'
  static RESPONSE_PREPARED = 'stonejs@router.response_prepared'
  static PREPARING_RESPONSE = 'stonejs@router.preparing_response'
}
