const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

function runWithContext(store, callback) {
  return asyncLocalStorage.run(store, callback);
}

function getCorrelationId() {
  const store = asyncLocalStorage.getStore();
  return store ? store.correlationId : null;
}

module.exports = {
  asyncLocalStorage,
  runWithContext,
  getCorrelationId
};

