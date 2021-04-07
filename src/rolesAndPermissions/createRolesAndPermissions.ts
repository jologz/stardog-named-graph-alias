import { Connection } from 'stardog'
import { processEnv } from '../processEnv'
import Security from './security'

const createRolesAndPermissions = async () => {
    console.log('\n\n===== START: createRolesAndPermission =====')
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

    const security = Security({
        conn,
        dbName,
    })

    await security.run()

    console.log('===== END: createRolesAndPermissions =====')
}

createRolesAndPermissions()
