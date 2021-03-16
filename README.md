# Creating Stardog Named Graph Aliases

## Description

This project will show you how to use:

-   Add data from one named graph to another
-   Add / remove named graph alias
-   `db.transaction.begin` and `db.transaction.commit` so you can see the changes first before committing any update to your database.
-   `query.execute`

It uses [stardog.js](https://github.com/stardog-union/stardog.js) npm package.

## Usage

I have attached [fibo_urn_GLEIF.ttl](./data/fibo_urn_GLEIF.ttl) so you can upload it to your database.

Example RDF Upload:

Run the code by doing `npm run start` and it will transpile the typescript files and build the project. It will then run `node build/app.js` to run the code. It will prompt you on some metadata the project needs. You can press `Enter` to use the default.