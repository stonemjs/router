import { comments } from "../../data/comments.mjs";
import { RouteResponse } from "@noowow-community/router"
import { Service } from "@noowow-community/service-container"

@Service({
  singleton: true
})
export class CommentController {

  listOrShow ({ request, params }) {
    console.log('List or show comment')
    return params.id ? this.show({ request, params }) : this.list()
  }

  list () {
    console.log('Get items')
    return comments
  }

  listByUser ({ params }) {
    console.log('Get items by user')
    return comments.filter(v => v.user_id === params.userId)
  }

  listByArticle ({ params }) {
    console.log('Get items by article')
    return comments.filter(v => v.article_id === params.articleId)
  }

  listByUserArticle ({ params }) {
    console.log('Get items by user and article')
    return comments.filter(v => v.article_id === params.articleId &&  v.user_id === params.userId)
  }

  show ({ request, params }) {
    console.log('Get item')
    console.log('Request and params', request, params)
    return comments.find(v => v.id === params.id)
  }

  create ({ request, payload }) {
    console.log('Create item')
    console.log('Request and payload', request, payload)
    comments.push({ ...payload, id: comments.length + 1 })
    return new RouteResponse({ statusCode: 201 })
  }

  update ({ request, payload, params, query }) {
    console.log('Update item')
    console.log('Request, params and payload', request, params, payload, query)
    comments = comments.map(v => v.id === params.id ? ({ ...v, ...payload, id: v.id }) : v)
    return new RouteResponse({ statusCode: 200, content: comments.find(v => v.id === params.id) })
  }

  remove ({ request, params }) {
    console.log('Delete item')
    console.log('Request and params', request, params)
    comments = comments.filter(v => v.id !== params.id)
    return new RouteResponse({ statusCode: 201 })
  }
}