import { Connection } from 'stardog'
import DbSettings from './dbSettings'
import { processEnv } from './processEnv'

const setNamedAliasSettings = async () => {
    console.log('\n\n===== START: setNamedAliasSettings =====')
    const {
        DATABASE_USERNAME: username,
        DATABASE_PASSWORD: password,
        DATABASE_URL: endpoint,
        NG_DBNAME: dbName,
    } = processEnv()

    console.log('DATABASE_URL: ', endpoint)
    console.log('DATABASE_USERNAME: ', username)
    console.log('DATABASE_PASSWORD: ', password)
    console.log('NG_DBNAME: ', dbName)

    const conn = new Connection({
        username,
        password,
        endpoint,
    })
    // Check DB setup
    // We can now enable Named Graph Security
    // and check if Named Graph Alias is allowed.
    const dbSettings = DbSettings({
        conn,
        dbName,
    })
    await dbSettings.run()
    console.log('\n\n===== END: setNamedAliasSettings =====')
}

setNamedAliasSettings()
