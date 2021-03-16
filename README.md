# Creating Stardog Named Graph Aliases

## Description

This project will show you how to:

-   Add data from one named graph to another
-   Add / remove named graph alias
-   Use `db.transaction.begin` and `db.transaction.commit` so you can see the changes first before committing any update to your database.
-   Use `query.execute`

It uses [stardog.js](https://github.com/stardog-union/stardog.js) npm package.

## Usage

I have attached [fibo_urn_GLEIF.ttl](./data/fibo_urn_GLEIF.ttl) so you can upload it to your database.

Example RDF Upload:
![image](https://user-images.githubusercontent.com/3269153/111329332-6d53b580-8645-11eb-8468-e5aca9a7e60f.png)

To follow along, make sure you name your graph as `URN:GLEIF`

Run the code by doing `npm run start`. It will transpile the typescript files and build the project. It will then run `node build/app.js` to run the code. It will prompt you on some metadata the project needs. You can press `Enter` to use the default.

## Sample Node
![image](https://user-images.githubusercontent.com/3269153/111330133-10a4ca80-8646-11eb-8f92-786f264ea3e9.png)
