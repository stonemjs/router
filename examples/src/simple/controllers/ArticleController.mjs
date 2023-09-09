import { articles } from "../../data/articles.mjs";
import { RouteResponse } from "@noowow-community/router"
import { Service } from "@noowow-community/service-container"

@Service({
  singleton: true
})
export class ArticleController {

  list () {
    console.log('Get items')
    return articles
  }

  listByUser ({ params }) {
    console.log('Get items by user')
    return articles.filter(v => v.user_id === params.userId)
  }

  show ({ request, params }) {
    console.log('Get item')
    console.log('Request and params', request, params)
    return articles.find(v => v.id === params.id)
  }

  create ({ request, payload }) {
    console.log('Create item')
    console.log('Request and payload', request, payload)
    articles.push({ ...payload, id: articles.length + 1 })
    return new RouteResponse({ statusCode: 201 })
  }

  update ({ request, payload, params }) {
    console.log('Update item')
    console.log('Request, params and payload', request, params, payload)
    articles = articles.map(v => v.id === params.id ? ({ ...v, ...payload, id: v.id }) : v)
    return new RouteResponse({ statusCode: 200, content: articles.find(v => v.id === params.id) })
  }

  remove ({ request, params }) {
    console.log('Delete item')
    console.log('Request and params', request, params)
    articles = articles.filter(v => v.id !== params.id)
    return new RouteResponse({ statusCode: 201 })
  }
}