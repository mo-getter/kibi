var _       = require('lodash');
var Promise = require('bluebird');
var url     = require('url');
var config  = require('../../config');
var pg      = require('pg');
var logger  = require('../logger');
var AbstractQuery = require('./abstractQuery');

var debug = false;

function PostgresQuery(queryDefinition, cache) {
  AbstractQuery.call(this, queryDefinition, cache);
}

PostgresQuery.prototype = _.create(AbstractQuery.prototype, {
  'constructor': PostgresQuery
});

/* return a promise which when resolved should return
 * a following response object
 * {
 *    "boolean": true/false
 * }
 */
PostgresQuery.prototype.checkIfItIsRelevant = function (uri) {
  if (this.activationQueryRequireEntityURI && (!uri || uri === '')) {
    return Promise.reject('Got empty uri while it is required by postgres activation query');
  }

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getSqlQueryFromConfig(this.config.activationQuery, uri);

  if (query.trim() === '') {
    return Promise.resolve({'boolean': true});
  }

  var self = this;


  var cache_key = this.generateCacheKey(datasource.uri, query);

  if (self.cache) {
    var v = self.cache.get(cache_key);
    if (v) {
      return Promise.resolve(v);
    }
  }

  return new Promise(function (fulfill, reject) {
    try {
      pg.connect(datasource.uri, function (err, client, done) {
        if (err) {
          reject(err);
        }
        client.query(query, function (err, result) {
          if (err) {
            reject(err);
          }
          // szydan 29-Apr-2015: we've seen an error where for some reason
          // result was undefined. I was not able to reproduce this
          // adding extra check to reject the Promise in such situation
          if (result === undefined) {
            reject(new Error('No rows property in results'));
          }
          var data = {'boolean': result.rows.length > 0 ? true : false};

          if (self.cache) {
            self.cache.set(cache_key, data, datasource.maxAge);
          }
          fulfill(data);
          client.end();
          //done(); //TODO: investigate where exactly to call this method to release client to the pool
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};


PostgresQuery.prototype._getType = function (typeNum) {
  // extracted from http://doxygen.postgresql.org/include_2catalog_2pg__type_8h_source.html
  var types = {
    16: 'BOOL',
    17: 'BYTEA',
    18: 'CHAR',
    19: 'NAME',
    20: 'INT8',
    21: 'INT2',
    22: 'INT2VECTOR',
    23: 'INT4',
    24: 'REGPROC',
    25: 'TEXT',
    26: 'OID',
    27: 'TID',
    28: 'XID',
    29: 'CID',
    30: 'OIDVECTOR',
    114: 'JSON',
    142: 'XML',
    194: 'PGNODETREE',
    600: 'POINT',
    601: 'LSEG',
    602: 'PATH',
    603: 'BOX',
    604: 'POLYGON',
    628: 'LINE',
    700: 'FLOAT4',
    701: 'FLOAT8',
    702: 'ABSTIME',
    703: 'RELTIME',
    704: 'TINTERVAL',
    705: 'UNKNOWN',
    718: 'CIRCLE',
    790: 'CASH',
    829: 'MACADDR',
    869: 'INET',
    650: 'CIDR',
    1005: 'INT2ARRAY',
    1007: 'INT4ARRAY',
    1009: 'TEXTARRAY',
    1028: 'OIDARRAY',
    1021: 'FLOAT4ARRAY',
    1033: 'ACLITEM',
    1263: 'CSTRINGARRAY',
    1042: 'BPCHAR',
    1043: 'VARCHAR',
    1082: 'DATE',
    1083: 'TIME',
    1114: 'TIMESTAMP',
    1184: 'TIMESTAMPTZ',
    1186: 'INTERVAL',
    1266: 'TIMETZ',
    1560: 'BIT',
    1562: 'VARBIT',
    1700: 'NUMERIC',
    1790: 'REFCURSOR',
    2202: 'REGPROCEDURE',
    2203: 'REGOPER',
    2204: 'REGOPERATOR',
    2205: 'REGCLASS',
    2206: 'REGTYPE',
    2211: 'REGTYPEARRAY',
    2950: 'UUID',
    3220: 'LSN',
    3614: 'TSVECTOR',
    3642: 'GTSVECTOR',
    3615: 'TSQUERY',
    3734: 'REGCONFIG',
    3769: 'REGDICTIONARY',
    3802: 'JSONB',
    3904: 'INT4RANGE',
    2249: 'RECORD',
    2287: 'RECORDARRAY',
    2275: 'CSTRING',
    2276: 'ANY',
    2277: 'ANYARRAY',
    2278: 'VOID',
    2279: 'TRIGGER',
    3838: 'EVTTRIGGER',
    2280: 'LANGUAGE_HANDLER',
    2281: 'INTERNAL',
    2282: 'OPAQUE',
    2283: 'ANYELEMENT',
    2776: 'ANYNONARRAY',
    3500: 'ANYENUM',
    3115: 'FDW_HANDLER',
    3831: 'ANYRANGE'
  };
  return types[typeNum] ? types[typeNum] : typeNum;
};


PostgresQuery.prototype.fetchResults = function (uri, onlyIds, idVariableName) {
  var start = new Date().getTime();
  var self = this;

  var datasource = config.kibana.datasources[this.config.datasourceId];
  var query = this._getSqlQueryFromConfig(this.config.resultQuery, uri);

  // special case if the uri is required but it is empty
  if (debug) {
    console.log('----------');
    console.log('this.resultQueryRequireEntityURI: [' + this.resultQueryRequireEntityURI + ']');
    console.log('uri: [' + uri + ']');
    console.log('query: [' + query + ']');
  }

  // special case - we can not simply reject the Promise
  // bacause this will cause the whole group of promissses to be rejected
  if (this.resultQueryRequireEntityURI && (!uri || uri === '')) {
    if (debug) {
      console.log('Special case going to return resolved Promise with empty results data');
    }
    return this._returnAnEmptyQueryResultsPromise('No data because the query require entityURI');
  }

  if (debug) {
    console.log('start to fetch results for');
    console.log(query);
  }

  var cache_key = this.generateCacheKey(datasource.uri, query, onlyIds, idVariableName);

  if (self.cache) {
    var v =  self.cache.get(cache_key);
    if (v) {
      v.queryExecutionTime = new Date().getTime() - start;
      return Promise.resolve(v);
    }
  }


  return new Promise(function (fulfill, reject) {
    try {
      pg.connect(datasource.uri, function (err, client, done) {
        if (err) {
          reject(err);
          return;
        }

        if (debug) {
          console.log('got client');
        }


        client.query(query, function (err, result) {
          if (err) {
            if (err.message) {
              err = {
                error: err,
                message: err.message
              };
            }

            if (debug) {
              console.log('got error instead of result');
              console.log(err);
            }

            reject(err);
            return;
          }

          if (debug) {
            console.log('got result');
          }

          var data = {
            ids: [],
            queryActivated: true
          };
          if (!onlyIds) {
            var _varTypes = {};
            _.each(result.fields, function (field) {
              _varTypes[field.name] = self._getType(field.dataTypeID);
            });


            data.head = {
              vars: _.map(result.fields, function (field) {
                return field.name;
              })
            };
            data.config = {
              label: self.config.label,
              esFieldName: self.config.esFieldName
            };
            data.results = {
              bindings: _.map(result.rows, function (row) {
                var res = {};
                for (var v in row) {
                  if (row.hasOwnProperty(v)) {
                    res[v] = {
                      type: _varTypes[v],
                      value: row[v]
                    };
                  }
                }
                return res;
              })
            };
          }

          if (idVariableName) {
            data.ids = self._extractIdsFromSql(result.rows, idVariableName);
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
          client.end();
          //done(); //TODO: investigate where exactly to call this method to release client to the pool
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

PostgresQuery.prototype._postprocessResults = function (data) {
  return data;
};


module.exports = PostgresQuery;
