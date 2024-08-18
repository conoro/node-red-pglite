node-red-node-pglite
====================

A Node-RED node to read and write local [PGlite](https://pglite.dev/) databases. PGlite is a WASM build of Postgres, packaged into a TypeScript/JavaScript client library, that enables you to run Postgres in the browser, in Node.js and in Bun. It has support for many Postgres extensions, including pgvector. The Node.js support is what enables it to run in Node-RED.

This module is a fork of [node-red-node-sqlite](https://github.com/node-red/node-red-nodes/tree/master/storage/sqlite). Many thanks to its authors. 

Install
-------

Until it's available in the Node-RED library, you install it as follows:

```
cd
git clone https://github.com/conoro/node-red-pglite.git
cd ~/.node-red
npm i ~/node-red-pglite
```

**Notes**:

  - This makes use of an early release of PGlite. Production deployment is not recommended
  - You may be able to load more Postgres extensions soon. Currently it loads pgvector and hstore. [Full PGlist list here](https://pglite.dev/extensions/).
  - Full Text Search is supported
  - A flow with losts of examples in included

Usage
-----

This node provides access to PGlite databases both on-disk and in-memory. Either define the path where you want the database files stored when adding a DB in the node, or set the database name to `:memory:` to create a non-persistent in-memory database. The directory will be created in the former case.

The SQL Query Type sets how the query is passed to the node.

* SQL Query Type "via msg.topic" uses the db.query operation against the configured database. msg.topic must hold the query for the database. The parameters can be passed in the query using a msg.payload array. This allows for INSERTS, UPDATES and DELETES. SQL Injection is possible. In the current version of PGlite, named parameters are not supported yet, only numbered ones.

E.g.:

```
msg.topic = `INSERT INTO user_table (name, surname) VALUES ($1, $2)`
msg.payload = ["John", "Smith"]
return msg;
```
* SQL Query Type "Fixed Statement" uses the db.query operation against the configured database. No parameters are allowed. The query must be entered in the node config

* SQL Query Type "Batch without response" uses db.exec which runs all SQL statements in the provided string in msg.topic. No parameters are allowed. No result rows are returned. It can be used for migrations etc.

Using any SQL Query, the result is returned in msg.payload


Conor O'Neill, conor@conoroneill.com, 2024.
