import { users } from "../../data/users.mjs";

export class UserController {

  list () {
    console.log('Get users')
    return users
  }

  show ({ request, params }) {
    console.log('Get user')
    console.log('Request and params', request, params)
    return users.find(v => v.id === params.id)
  }

  create ({ request, payload }) {
    console.log('Create user')
    console.log('Request and payload', request, payload)
    users.push({ ...payload, id: users.length + 1 })
    return new RouteResponse({ statusCode: 201 })
  }

  update ({ request, payload, params }) {
    console.log('Update user')
    console.log('Request, params and payload', request, params, payload)
    users = users.map(v => v.id === params.id ? ({ ...v, ...payload, id: v.id }) : v)
    return new RouteResponse({ statusCode: 200, content: users.find(v => v.id === params.id) })
  }

  remove ({ request, params }) {
    console.log('Delete user')
    console.log('Request and params', request, params)
    users = users.filter(v => v.id !== params.id)
    return new RouteResponse({ statusCode: 201 })
  }
}