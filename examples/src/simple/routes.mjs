import { ArticleController } from "./controllers/ArticleController.mjs";
import { CommentController } from "./controllers/CommentController.mjs";
import { UserController } from "./controllers/UserController.mjs";
import { RouteResponse } from "@noowow-community/router"
import { AuthMiddleware } from "./middleware/AuthMiddleware.mjs";
import { router } from "./services.mjs";

// Route definition
export const routes = [
  router.get({
    uri: '/users',
    name: 'user.list',
    middleware: [AuthMiddleware],
    action: [UserController, 'list']
  }),
  router.get({
    uri: '/users/:id',
    name: 'user.show',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [UserController, 'show']
  }),
  router.post({
    uri: '/users',
    name: 'user.post',
    middleware: [AuthMiddleware],
    action: [UserController, 'create']
  }),
  router.put({
    uri: '/users/:id',
    name: 'user.put',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [UserController, 'update']
  }),
  router.delete({
    uri: '/users/:id',
    name: 'user.delete',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [UserController, 'remove']
  }),


  router.get({
    uri: '/articles',
    name: 'article.list',
    middleware: [AuthMiddleware],
    action: [ArticleController, 'list']
  }),
  router.get({
    uri: '/users/:id/articles',
    name: 'user.article.list',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [ArticleController, 'listByUser']
  }),
  router.get({
    uri: '/articles/:id',
    name: 'article.show',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [ArticleController, 'show']
  }),
  router.post({
    uri: '/articles',
    name: 'article.post',
    middleware: [AuthMiddleware],
    action: [ArticleController, 'create']
  }),
  router.put({
    uri: '/articles/:id',
    name: 'article.put',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [ArticleController, 'update']
  }),
  router.delete({
    uri: '/articles/:id',
    name: 'article.delete',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [ArticleController, 'remove']
  }),


  router.get({
    uri: '/comments',
    name: 'comment.list',
    middleware: [AuthMiddleware],
    action: [CommentController, 'list']
  }),
  router.get({
    uri: '/comments/list-or-show/:id?',
    name: 'comment.list',
    middleware: [AuthMiddleware],
    action: [CommentController, 'listOrShow']
  }),
  router.get({
    uri: '/users/:id/comments',
    name: 'user.comment.list',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'listByUser']
  }),
  router.get({
    uri: '/articles/:id/comments',
    name: 'article.comment.list',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'listByArticle']
  }),
  router.get({
    uri: '/users/:userId/articles/:articleId/comments',
    name: 'user.article.comment.list',
    rules: { userId: /\d+/, articleId: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'listByUserArticle']
  }),
  router.get({
    uri: '/comments/:id',
    name: 'comment.show',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'show']
  }),
  router.post({
    uri: '/comments',
    name: 'comment.post',
    middleware: [AuthMiddleware],
    action: [CommentController, 'create']
  }),
  router.put({
    uri: '/comments/:id',
    name: 'comment.put',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'update']
  }),
  router.delete({
    uri: '/comments/:id',
    name: 'comment.delete',
    rules: { id: /\d+/ },
    middleware: [AuthMiddleware],
    action: [CommentController, 'remove']
  }),
  router.fallback(() => new RouteResponse({ statusCode: 404, statusText: 'Not Found' }))
]