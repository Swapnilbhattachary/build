'use strict'

const safeJsonStringify = require('safe-json-stringify')

const { CUSTOM_ERROR_KEY } = require('./info')

// Retrieve error information from child process and re-build it in current
// process. We need this since errors are not JSON-serializable.
const jsonToError = function ({ name, message, stack, ...errorProps }) {
  // eslint-disable-next-line unicorn/error-message
  const error = new Error('')

  assignErrorProps(error, { name, message, stack })
  // Assign static error properties (if any)
  // We need to mutate the `error` directly to preserve its `name`, `stack`, etc.
  // eslint-disable-next-line fp/no-mutating-assign
  Object.assign(error, errorProps)

  return error
}

// Make sure `name`, `message` and `stack` are not enumerable
const assignErrorProps = function (error, values) {
  ERROR_PROPS.forEach((name) => {
    assignErrorProp(error, name, values[name])
  })
}

const ERROR_PROPS = ['name', 'message', 'stack']

const assignErrorProp = function (error, name, value) {
  // `Object.defineProperty()` requires direct mutation
  // eslint-disable-next-line fp/no-mutating-methods
  Object.defineProperty(error, name, { value, enumerable: false, writable: true, configurable: true })
}

// Inverse of `jsonToError()`.
// IPC uses JSON for the payload. We ensure there are not circular references
// as those would make the message sending fail.
const errorToJson = function ({ name, message, stack, [CUSTOM_ERROR_KEY]: customError, ...errorProps }) {
  return {
    ...safeJsonStringify.ensureProperties(errorProps),
    ...safeJsonStringify.ensureProperties({ name, message, stack, [CUSTOM_ERROR_KEY]: customError }),
  }
}

module.exports = { jsonToError, errorToJson }
