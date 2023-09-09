export default class EventManager {
  constructor () {
    this.listeners = new Map()
  }

  subscribe (eventType, callback) {
    const callbacks = this.listeners.get(eventType) ?? new Set()
    !callbacks.has(callback) && callbacks.add(callback)
    this.listeners.set(eventType, callbacks)
    return this
  }

  unsubscribe (eventType, callback) {
    this.listeners.get(eventType)?.delete(callback)
    return this
  }

  notify (eventType, data) {
    this.listeners.get(eventType).forEach(callback => callback(data))
    return this
  }
}
