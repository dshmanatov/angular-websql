/**
 * angular-websql
 * Helps you generate and run websql queries with angular services.
 * © MIT License
 */
(function (module) {

    "use strict";

    module.factory("$webSql", ['$q',
        function ($q) {
            return {
                openDatabase: function (dbName, version, desc, size) {
                    try {
                        var db = openDatabase(dbName, version, desc, size);
                        if (typeof openDatabase === "undefined") {
                            throw "Browser does not support web sql";
                        };

                        var service = {
                            executeQuery: function (query, callback) {
                                db.transaction(function (tx) {
                                    tx.executeSql(query, [], function (tx, results) {
                                        if (callback) {
                                            callback(results);
                                        }
                                    }, function (tx, error) {
                                        console.log("SQL Error in query", query, error);
                                    });
                                });
                                return this;
                            },
                            transaction: function (callback) {
                                db.transaction(function (tx) {
                                    callback(tx);
                                });
                            },
                            query: function (query, fields, firstOnly) {
                                console.log("HERE", query, fields);
                                var deferred = $q.defer();

                                db.transaction(function (tx) {
                                    tx.executeSql(query, fields, function (tx, results) {
                                        var rows = [],
                                            i;

                                        if (firstOnly) {
                                            rows = results.rows.item(0);
                                        } else {
                                            for (i = 0; i < results.rows.length; i++) {
                                                rows.push(results.rows.item(i));
                                            }
                                        }

                                        console.log("INE", rows);

                                        deferred.resolve(rows);
                                    }, function (tx, error) {
                                        console.log("Rejecting", error);
                                        deferred.reject(error);
                                    });
                                });

                                return deferred.promise;
                            },
                            queryFirst: function (query, fields) {
                                return this.query(query, fields, true);
                            },
                            queryFirstCell: function (query, fields) {
                                return this.queryFirst(query, fields, true)
                                    .then(function (row) {
                                        return $q.when(_.values(row)[0]);
                                    });
                            },
                            queryArray: function (tableName, where, addToQuery, callback) {
                                var deferred = $q.defer();

                                this.select(tableName, where, addToQuery, function (results) {
                                    var rows = [],
                                        i;

                                    for (i = 0; i < results.rows.length; i++) {
                                        rows.push(results.rows.item(i));
                                    }

                                    if (typeof callback === 'function') {
                                        callback(rows);
                                    }

                                    deferred.resolve(rows);
                                });

                                return deferred.promise;
                            },
                            queryAllArray: function (tableName, addToQuery) {
                                var deferred = $q.defer();

                                this.selectAll(tableName, addToQuery, function (results) {
                                    var rows = [],
                                        i;

                                    for (i = 0; i < results.rows.length; i++) {
                                        rows.push(results.rows.item(i));
                                    }

                                    deferred.resolve(rows);
                                }, function (e) {
                                    console.log("ERR", e);
                                    deferred.reject(e);
                                });

                                return deferred.promise;
                            },
                            insertArray: function (c, arr) {
                                var that = this,
                                    deferred;

                                deferred = $q.defer();

                                db.transaction(function (tx) {
                                    var promises = [];

                                    angular.forEach(arr, function (e) {
                                        var subDeferred = $q.defer();

                                        var f = "INSERT INTO `{tableName}` ({fields}) VALUES({values}); ";
                                        var a = "",
                                            b = "";
                                        for (var d in e) {
                                            a += (Object.keys(e)[Object.keys(e).length - 1] == d) ? "`" + d + "`" :
                                                "`" + d + "`, ";
                                            b += (Object.keys(e)[Object.keys(e).length - 1] == d) ? "'" + e[d] + "'" :
                                                "'" + e[d] + "', "
                                        }
                                        var q = that.replace(f, {
                                            "{tableName}": c,
                                            "{fields}": a,
                                            "{values}": b
                                        });

                                        console.log("Query", q);
                                        tx.executeSql(q, [], function() {
                                            subDeferred.resolve(true);
                                        }, function(q, e) {
                                            // subDeferred.reject(e);
                                            subDeferred.resolve(true);
                                        });

                                        promises.push(subDeferred.promise);
                                    });

                                    $q.all(promises).then(function() {
                                        deferred.resolve();
                                    }, function(e) {
                                        deferred.reject(e);
                                    });
                                });

                                return deferred.promise;
                            },
                            insert: function (c, e, callback) {
                                var f = "INSERT INTO `{tableName}` ({fields}) VALUES({values}); ";
                                var a = "",
                                    b = "";
                                for (var d in e) {
                                    a += (Object.keys(e)[Object.keys(e).length - 1] == d) ? "`" + d + "`" :
                                        "`" + d + "`, ";
                                    b += (Object.keys(e)[Object.keys(e).length - 1] == d) ? "'" + e[d] + "'" :
                                        "'" + e[d] + "', "
                                }
                                this.executeQuery(this.replace(f, {
                                    "{tableName}": c,
                                    "{fields}": a,
                                    "{values}": b
                                }), callback);
                                return this;
                            },
                            update: function (b, g, c, callback) {
                                var f = "UPDATE `{tableName}` SET {update} WHERE {where}; ";
                                var e = "";
                                for (var d in g) {
                                    e += "`" + d + "`='" + g[d] + "'"
                                }
                                var a = this.whereClause(c);
                                this.executeQuery(this.replace(f, {
                                    "{tableName}": b,
                                    "{update}": e,
                                    "{where}": a
                                }), callback);
                                return this;
                            },
                            del: function (b, c, callback) {
                                var d = "DELETE FROM `{tableName}`";
                                var a = this.whereClause(c);

                                if (a) {
                                    d += " WHERE {where}; ";
                                }

                                this.executeQuery(this.replace(d, {
                                    "{tableName}": b,
                                    "{where}": a
                                }), callback);
                                return this;
                            },
                            select: function (b, c, addToQuery, callback) {
                                var d = "SELECT * FROM `{tableName}` WHERE {where} " + (addToQuery || "") + ";";
                                var a = this.whereClause(c);
                                var q = this.replace(d, {
                                    "{tableName}": b,
                                    "{where}": a
                                });

                                this.executeQuery(q, callback);
                                return this;
                            },
                            selectAll: function (a, addToQuery, callback) {
                                var cb = callback ? callback : (typeof addToQuery === 'function' ? addToQuery : null);

                                this.executeQuery("SELECT * FROM `" + a + "` " + (
                                    addToQuery ? addToQuery : "") + "; ", cb);
                                return this;
                            },
                            whereClause: function (b, callback) {
                                var a = "";
                                for (var c in b) {
                                    a += (typeof b[c] === "object") ? (typeof b[c]["union"] === "undefined") ?
                                        (typeof b[c]["value"] === "string" && b[c]["value"].match(/NULL/ig)) ?
                                            "`" + c + "` " + b[c]["value"] :
                                            "`" + c + "` " + b[c]["operator"] + " '" + b[c]["value"] + "'" :
                                        (typeof b[c]["value"] === "string" && b[c]["value"].match(/NULL/ig)) ?
                                            "`" + c + "` " + b[c]["value"] + " " + b[c]["union"] + " " :
                                            "`" + c + "` " + b[c]["operator"] + " '" + b[c]["value"] + "' " + b[c]["union"] + " " :
                                        (typeof b[c] === "string" && b[c].match(/NULL/ig)) ? "`" + c + "` " + b[c] :
                                            "`" + c + "`='" + b[c] + "'"
                                }
                                return a;
                            },
                            replace: function (a, c, callback) {
                                for (var b in c) {
                                    a = a.replace(new RegExp(b, "ig"), c[b])
                                }
                                return a;
                            },
                            createTable: function (j, g, callback) {
                                var b = "CREATE TABLE IF NOT EXISTS `{tableName}` ({fields}); ";
                                var c = [];
                                var a = "";
                                for (var e in g) {
                                    var l = "{type} {null}";
                                    a += "`" + e + "` ";
                                    for (var k in g[e]) {
                                        l = l.replace(new RegExp("{" + k + "}", "ig"), g[e][k])
                                    }
                                    a += l;
                                    if (typeof g[e]["default"] !== "undefined") {
                                        a += " DEFAULT " + g[e]["default"]
                                    }
                                    if (typeof g[e]["primary"] !== "undefined") {
                                        a += " PRIMARY KEY"
                                    }
                                    if (typeof g[e]["auto_increment"] !== "undefined") {
                                        a += " AUTOINCREMENT"
                                    }
                                    if (Object.keys(g)[Object.keys(g).length - 1] != e) {
                                        a += ","
                                    }
                                    if (typeof g[e]["primary"] !== "undefined" && g[e]["primary"]) {
                                        c.push(e)
                                    }
                                }
                                var d = {
                                    tableName: j,
                                    fields: a
                                };
                                for (var f in d) {
                                    b = b.replace(new RegExp("{" + f + "}", "ig"), d[f])
                                }
                                this.executeQuery(b, callback);
                                return this;
                            },
                            dropTable: function (a, callback) {
                                this.executeQuery("DROP TABLE IF EXISTS `" + a + "`; ", callback);
                                return this;
                            }
                        };

                        return service;
                    } catch (err) {
                        console.error("DB Error", err);
                    }
                }
            }
        }
    ]);
})(angular.module("angular-websql", []));