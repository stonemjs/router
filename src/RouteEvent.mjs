import { Event } from '@stone-js/core'

/**
 * Class representing a Route Event.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @extends Event
 */
export class RouteEvent extends Event {
  /**
   * ROUTING Event name, fires before event match route.
   *
   * @type {string}
   * @event Event#ROUTING
   */
  static ROUTING = 'stonejs@router.routing'

  /**
   * ROUTE_MATCHED Event name, fires after event matched route.
   *
   * @type {string}
   * @event Event#ROUTE_MATCHED
   */
  static ROUTE_MATCHED = 'stonejs@router.route_matched'
}
