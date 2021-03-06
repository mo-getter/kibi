var _ = require('lodash');
var Promise = require('bluebird');
var url = require('url');
var config = require('../../config');
var sqlite3 = require('sqlite3');
var logger = require('../logger');
var AbstractQuery = require('./abstractQuery');

var debug = false;


function SQLiteQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}


SQLiteQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': SQLiteQuery
});


/**
 * Opens a connection to the database.
 *
 * Returns a promise that is fulfilled with a reference to the connection if
 * opened succesfully or rejected with an error.
 */
SQLiteQuery.prototype.openConnection = function () {
  var datasource = config.kibana.datasources[this.config.datasourceId];
  var self = this;
  return new Promise(function (fulfill, reject) {
    if (self._connection) {
      fulfill(self._connection);
      return;
    }
    var path = require('path');
    var dbfile = datasource.dbfile;
    if (datasource.dbfile && path.resolve(dbfile) !== path.normalize(dbfile)) {
      // if dbfile is not an absolute path
      var rootDir = process.env.ROOT_DIR;
      if (rootDir) {
        dbfile = path.join(rootDir, datasource.dbfile);
      }
    }
    var db = new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY, function (error) {
      if (error) {
        reject(self._augmentError(error));
        return;
      }

      self._connection = db;
      fulfill(self._connection);
    });
  });
};


/**
 * Checks if the query is relevant (i.e. if it returns one or more rows).
 *
 * Returns a promise fulfilled with the following object:
 *
 * {
 *    "boolean": true/false
 * }
 */
SQLiteQuery.prototype.checkIfItIsRelevant = function (uri) {
  if (this.requireEntityURI && (!uri || uri === '')) {
    return Promise.reject('Entity URI must be specified to execute the query.');
  }

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getSqlQueryFromConfig(this.config.activationQuery, uri);

  if (query.trim() === '') {
    return Promise.resolve({'boolean': true});
  }

  var self = this;

  var cache_key = this.generateCacheKey(datasource.dbfile, query);

  if (self.cache) {
    var v = self.cache.get(cache_key);
    if (v) {
      return Promise.resolve(v);
    }
  }

  return new Promise(function (fulfill, reject) {
    self.openConnection()
      .then(function (connection) {
        connection.get(query, function (error, row) {

          if (error) {
            reject(self._augmentError(error));
            return;
          }

          var data = {
            'boolean': row ? true : false
          };

          if (self.cache) {
            self.cache.set(cache_key, data, datasource.maxAge);
          }

          fulfill(data);
        });
      })
      .catch(function (error) {
        reject(self._augmentError(error));
      });
  });
};


/**
 * Executes the query.
 */
SQLiteQuery.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getSqlQueryFromConfig(this.config.resultQuery, uri);

  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promises to be rejected
  if (this.resultQueryRequireEntityURI && (!uri || uri === '')) {
    return this._returnAnEmptyQueryResultsPromise('Missing entityURI');
  }

  var cache_key = this.generateCacheKey(datasource.dbfile, query, onlyIds, idVariableName);

  if (self.cache) {
    var v =  self.cache.get(cache_key);
    if (v) {
      v.queryExecutionTime = new Date().getTime() - start;
      return Promise.resolve(v);
    }
  }

  return new Promise(function (fulfill, reject) {
    self.openConnection()
      .then(function (connection) {
        connection.all(query, function (error, rows) {
          if (error) {
            reject(self._augmentError(error));
            return;
          }

          var data = {
            ids: [],
            queryActivated: true
          };

          if (!onlyIds) {
            var fields;

            data.head = {
              vars: []
            };
            data.config = {
              label: self.config.label,
              esFieldName: self.config.esFieldName
            };
            data.results = {
              bindings: _.map(rows, function (row) {
                var res = {};

                if (!fields) {
                  fields = Object.keys(row);
                }
                for (var v in row) {
                  if (row.hasOwnProperty(v)) {
                    res[v] = {
                      type: 'unknown',
                      value: row[v]
                    };
                  }
                }
                return res;
              })
            };

            if (fields) {
              data.head.vars = fields;
            }
          }

          if (idVariableName) {
            data.ids = self._extractIdsFromSql(rows, idVariableName);
          }

          if (self.cache) {
            self.cache.set(cache_key, data, datasource.maxAge);
          }

          data.debug = {
            sentDatasourceId: self.config.datasourceId,
            sentResultQuery: query,
            queryExecutionTime: new Date().getTime() - start
          };

          fulfill(data);
        });
      })
      .catch(function (error) {
        reject(self._augmentError(error));
      });
  });

};

SQLiteQuery.prototype._postprocessResults = function (data) {
  return data;
};


SQLiteQuery.prototype._augmentError = function (error) {
  if (error.message) {
    error = {
      error: error,
      message: error.message
    };
  }
  return error;
};


module.exports = SQLiteQuery;
