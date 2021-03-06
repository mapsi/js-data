/**
 * Using an adapter, destroy an item.
 *
 * @param resourceName The name of the type of resource of the item to destroy.
 * @param id The primary key of the item to destroy.
 * @param options Optional configuration.
 * @param options.eagerEject Whether to eject the item from the store before the adapter operation completes, re-injecting if the adapter operation fails.
 * @param options.notify Whether to emit the "DS.beforeDestroy" and "DS.afterDestroy" events.
 * @param options.beforeDestroy Lifecycle hook.
 * @param options.afterDestroy Lifecycle hook.
 * @returns The primary key of the destroyed item.
 */
module.exports = function destroy (resourceName, id, options) {
  let _this = this
  let DSUtils = _this.utils
  let definition = _this.definitions[resourceName]
  let item, adapter

  return new DSUtils.Promise(function (resolve, reject) {
    id = DSUtils.resolveId(definition, id)
    if (!definition) {
      reject(new _this.errors.NER(resourceName))
    } else if (!DSUtils._sn(id)) {
      reject(DSUtils._snErr('id'))
    } else {
      // check if the item is in the store
      item = definition.get(id) || { id: id }
      options = DSUtils._(definition, options)
      options.logFn('destroy', id, options)
      resolve(item)
    }
  })
    // start lifecycle
    .then(function (attrs) { return options.beforeDestroy.call(attrs, options, attrs) })
    .then(function (attrs) {
      if (options.notify) {
        definition.emit('DS.beforeDestroy', definition, attrs)
      }
      // don't wait for the adapter, remove the item from the store
      if (options.eagerEject) {
        definition.eject(id)
      }
      adapter = definition.getAdapter(options)
      return adapter.destroy(definition, id, options)
    })
    .then(function () { return options.afterDestroy.call(item, options, item) })
    .then(function (item) {
      if (options.notify) {
        definition.emit('DS.afterDestroy', definition, item)
      }
      // make sure the item is removed from the store
      definition.eject(id)
      return DSUtils.respond(id, {adapter}, options)
    })['catch'](function (err) {
    // rollback by re-injecting the item into the store
    if (options && options.eagerEject && item) {
      definition.inject(item, { notify: false })
    }
    return DSUtils.Promise.reject(err)
  })
}
