module.exports = function(RED) {
    "use strict";
    const fs = require('fs');
    const path = require('path');
    const { PGlite } = require("@electric-sql/pglite");
    const { vector } = require("@electric-sql/pglite/vector");
    const { hstore } = require("@electric-sql/pglite/contrib/hstore");

    function PgliteNodeDB(n) {
        RED.nodes.createNode(this,n);

        this.dbpath = n.db;
        var node = this;

        node.doConnect = function() {
            
            if (node.db) { 
                return; 
            }

            if (node.dbpath == ":memory:"){
               node.db = new PGlite({extensions: { vector, hstore }});
               node.log("opened in-memory DB OK");
            }
            else {
                try {
                    fs.accessSync(path.dirname(node.dbpath), fs.constants.W_OK);
                    node.db = new PGlite(node.dbpath, {extensions: { vector, hstore }});
                    node.log("opened "+node.dbpath+" ok");
                  } catch (error) {
                    node.error(error, path.dirname(node.dbpath) + 'is not writable');
                    return;
                  }
            }
            node.db.exec("CREATE EXTENSION IF NOT EXISTS vector;")
            .then(() => {
                node.log("Successfully loaded pgvector extension");
            })
            .catch((error) => {
                node.error(error,"Problem loading pgvector extension");
            })
            node.db.exec("CREATE EXTENSION IF NOT EXISTS hstore;")
            .then(() => {
                node.log("Successfully loaded hstore extension");
            })
            .catch((error) => {
                node.error(error,"Problem loading hstore extension");
            })
        }

        node.on('close', function (done) {
            if (node.tick) { clearTimeout(node.tick); }
            if (node.db) { node.db.close(done()); }
            else { done(); }
        });
    }
    RED.nodes.registerType("pglitedb",PgliteNodeDB);

    function PgliteNodeIn(n) {
        RED.nodes.createNode(this,n);
        this.mydb = n.mydb;
        this.sqlquery = n.sqlquery||"msg.topic";
        this.sql = n.sql;
        this.mydbConfig = RED.nodes.getNode(this.mydb);
        var node = this;
        node.status({});

        if (node.mydbConfig) {
            node.mydbConfig.doConnect();
            node.status({fill:"green",shape:"dot",text:"db connected"});

            var bind = [];

            var doQuery = function(msg) {
                bind = []
                if (node.sqlquery == "msg.topic") {
                    if (typeof msg.topic === 'string') {
                        if (msg.topic.length > 0) {
                            if (Array.isArray(msg.payload)) {
                                if (msg.payload.length === (msg.topic.split('$').length - 1) ) { 
                                    bind = msg.payload; 
                                }
                                else { 
                                    bind = []; 
                                }
                            }
                            node.mydbConfig.db.query(msg.topic, bind)
                            .then((response) => {
                              msg.payload = response;
                              node.send(msg);
                            })
                            .catch((error) => {
                                node.error(error,msg);
                            })
                        }
                }
                    else {
                        node.error("msg.topic : the query is not defined as a string",msg);
                        node.status({fill:"red",shape:"dot",text:"msg.topic error"});
                    }
                }
                if (node.sqlquery == "batch") {
                    if (typeof msg.topic === 'string') {
                        if (msg.topic.length > 0) {
                            node.mydbConfig.db.exec(msg.topic)
                            .then(() => {
                                msg.payload = [];
                                node.send(msg);
                              })
                              .catch((error) => {
                                  node.error(error,msg);
                              })
                        }
                    }
                    else {
                        node.error("msg.topic : the query is not defined as string", msg);
                        node.status({fill:"red", shape:"dot",text:"msg.topic error"});
                    }
                }
                if (node.sqlquery == "fixed") {
                    if (typeof node.sql === 'string') {
                        if (node.sql.length > 0) {
                            node.mydbConfig.db.query(node.sql)
                            .then((response) => {
                              msg.payload = response;
                              node.send(msg);
                            })
                            .catch((error) => {
                                node.error(error,msg);
                            })
                        }
                    }
                    else {
                        if (node.sql === null || node.sql == "") {
                            node.error("SQL statement config not set up",msg);
                            node.status({fill:"red",shape:"dot",text:"SQL config not set up"});
                        }
                    }
                }
            }

            node.on("input", function(msg) {
                doQuery(msg);
            });
        }
        else {
            node.error("Pglite database not configured");
        }
    }
    RED.nodes.registerType("pglite",PgliteNodeIn);
}
