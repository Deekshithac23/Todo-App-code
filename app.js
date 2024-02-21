const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'todoApplication.db')
let db = null

const format = require('date-fns/format')
const isMatch = require('date-fns/isMatch')
const isValid = require('date-fns/isValid')

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running At http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db error : ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const hasPriorityAndStatus = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasPriority = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatus = requestQuery => {
  return requestQuery.status !== undefined
}

const hasCategory = requestQuery => {
  return requestQuery.category !== undefined
}

const hasCategoryAndStatus = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndPriority = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const hasSearch = requestQuery => {
  return requestQuery.search_q !== undefined
}

const convertToDataResponse = dbObj => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    status: dbObj.status,
    category: dbObj.category,
    dueDate: dbObj.due_date,
  }
}

app.get('/todos/', async (request, response) => {
  const {search_q = '', priority, status, category} = request.query
  let data = null
  let getTodosQuery = ''

  switch (true) {
    case hasStatus(requestQuery):
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        getTodosQuery = `SELECT * FROM todo WHERE status = ${status};`
        data = await db.all(getTodosQuery)
        response.send(data.map(each => convertToDataResponse(each)))
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case hasPriority(requestQuery):
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        getTodosQuery = `SELECT * FROM todo WHERE priority = ${priority};`
        data = await db.all(getTodosQuery)
        response.send(data.map(each => convertToDataResponse(each)))
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case hasPriorityAndStatus(requestQuery):
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        if (
          status === 'TO DO' ||
          status === 'IN PROGRESS' ||
          status === 'DONE'
        ) {
          getTodosQuery = `SELECT * FROM todo WHERE priority='${priority}' && status='${status}';`
          data = await db.all(getTodosQuery)
          response.send(data.map(each => convertToDataResponse(each)))
        } else {
          response.status(400)
          response.send('Invalid Todo Status')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case hasSearch(requestQuery):
      getTodosQuery = `SELECT * FROM todo WHERE search_q LIKE '%${search_q}%';`
      data = await db.all(getTodosQuery)
      response.send(data.map(each => convertToDataResponse(each)))
      break
    case hasCategoryAndStatus(requestQuery):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (
          status === 'TO DO' ||
          status === 'IN PROGRESS' ||
          status === 'DONE'
        ) {
          getTodosQuery = `SELECT * FROM todo WHERE category = '${category}' && status='${status}';`
          data = await db.all(getTodosQuery)
          response.send(data.map(each => convertToDataResponse(each)))
        } else {
          response.status(400)
          response.send('Invalid Todo Status')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case hasCategory(requestQuery):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        getTodosQuery = `SELECT * FROM todo WHERE category='${category}';`
        data = await db.all(getTodosQuery)
        response.send(data.map(each => convertToDataResponse(each)))
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case hasCategoryAndPriority(requestQuery):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (
          priority === 'HIGH' ||
          priority === 'MEDIUM' ||
          priority === 'LOW'
        ) {
          getTodosQuery = `SELECT * FROM todo WHERE category = '${category}' && priority='${priority}';`
          data = await db.all(getTodosQuery)
          response.send(data.map(each => convertToDataResponse(each)))
        } else {
          response.status(400)
          response.send('Invalid Todo Priority')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    default:
      getTodosQuery = `SELECT * FROM TODO;`
      data = await db.all(getTodosQuery)
      response.send(data.map(each => convertToDataResponse(each)))
  }
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodosQuery = `SELECT * FROM todo WHERE todoId='${todoId}';`
  const dbResponse = await db.get(getTodosQuery)
  response.send(convertToDataResponse(dbResponse))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.params
  if (isMatch(date, 'yyyy-MM-dd')) {
    const newDate = format(new Date(date), 'yyyy-MM-dd')
    const getDateQuery = `SELECT * FROM todo WHERE due_date='${newDate}';`
    const dbResponse = await db.all(getDateQuery)
    response.send(dbResponse.map(each => convertToDataResponse(each)))
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
    if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (isMatch(dueDate, 'yyyy-MM-dd')) {
          const newDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
          const postQuery = `INSERT INTO todo(id, todo, priority, status, category, due_date) VALUES ('${id}','${todo}','${priority}','${status}','${category}','${dueDate}');`
          const postResponse = await db.run(postQuery)
          response.send('Todo Added Successfully')
        } else {
          response.status(400)
          response.send('Invalid Due Date')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
    }
  } else {
    response.status(400)
    response.send('Invalid Todo Priority')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let updateColumn = ''
  const requestBody = request.body
  const previousTodoQuery = `SELECT * FROM todo WHERE id = '${todoId}';`
  const previousTodo = await db.get(previousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body
  let updateTodo
  switch (true) {
    case requestBody.status !== undefined:
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        updateTodo = `UPDATE todo SET todo = '${todo}',priority='${priority}',status='${status}',category='${category}',dueDate='${dueDate}' WHERE id='${todoId}';`
        await db.run(updateTodo)
        response.send('Status Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case requestBody.priority !== undefined:
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        updateTodo = `UPDATE todo SET todo = '${todo}',priority='${priority}',status='${status}',category='${category}',dueDate='${dueDate}' WHERE id='${todoId}';`
        await db.run(updateTodo)
        response.send('Priority Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case requestBody.todo !== undefined:
      updateTodo = `UPDATE todo SET todo = '${todo}',priority='${priority}',status='${status}',category='${category}',dueDate='${dueDate}' WHERE id='${todoId}';`
      await db.run(updateTodo)
      response.send('Todo Updated')
      break
    case requestBody.category !== undefined:
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        updateTodo = `UPDATE todo SET todo = '${todo}',priority='${priority}',status='${status}',category='${category}',dueDate='${dueDate}' WHERE id='${todoId}';`
        await db.run(updateTodo)
        response.send('Category Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, 'yyyy-MM-dd')) {
        const newDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
        updateTodo = `UPDATE todo SET todo = '${todo}',priority='${priority}',status='${status}',category='${category}',dueDate='${dueDate}' WHERE id='${todoId}';`
        await db.run(updateTodo)
        response.send('Due Date Updated')
      } else {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `DELETE FROM todo WHERE id='${todoId}';`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
