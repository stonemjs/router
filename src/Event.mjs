import { AbstractEvent } from '@stone-js/common'

/**
 * Class representing a Route Event.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class Event extends AbstractEvent {
  /**
   * ROUTING Event name, fires before request match route.
   *
   * @type {string}
   */
  static ROUTING = 'stonejs@router.routing'

  /**
   * ROUTE_MATCHED Event name, fires after request matched route.
   *
   * @type {string}
   */
  static ROUTE_MATCHED = 'stonejs@router.route_matched'
}
