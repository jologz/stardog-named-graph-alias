import { env } from 'shelljs'
import { Connection } from 'stardog'
import { namedGraphUtil } from './namedGraphUtil'
import { processEnv } from './processEnv'

/**
 * REQUIREMENTS:
 *
 * ENVIRONMENT VARIABLES:
 * DATABASE_URL=http://localhost:5820
 * DATABASE_USERNAME=admin
 * DATABASE_PASSWORD=***
 * NG_DBNAME=[db name of where the named graph resides]
 * NG_ALIAS=[alias that the new named graph will use]
 * NG_NEW=[named graph new name]
 * NG_OLD=[named graph old name. the one that needs to be dropped] *
 */

/**
 *
 * @returns Space separated value (NewNamedGraph OldNamedGraph) or null
 */
export const getOldNewNGFromAlias = async () => {
    env['DATABASE_URL'] = 'http://localhost:5820'
    env['DATABASE_USERNAME'] = 'admin'
    env['DATABASE_PASSWORD'] = 'admin'
    env['NG_DBNAME'] = 'decomp'
    env['NG_ALIAS'] = ':a-tosc'

    const {
        DATABASE_USERNAME: username,
        DATABASE_PASSWORD: password,
        DATABASE_URL: endpoint,
        NG_DBNAME: dbName,
        NG_ALIAS: aliasName,
    } = processEnv()

    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const { getNamedGraphByAlias } = namedGraphUtil({
        conn,
        dbName,
    })

    const namedGraphs = await getNamedGraphByAlias(aliasName)
    if (namedGraphs.length !== 1) return null

    const oldNamedGraph = namedGraphs[0]
    let newNamedGraph: string

    // if oldNamedGraph has timestamp, replace that timestamp with a new one
    // for the newNamedGraph, else append timestamp
    let timestamp = `_TS_${Date.now()}`
    if (oldNamedGraph.indexOf('_TS_') > -1) {
        newNamedGraph = `${oldNamedGraph.substr(
            0,
            oldNamedGraph.indexOf('_TS_')
        )}${timestamp}`
    } else {
        newNamedGraph = `${oldNamedGraph}${timestamp}`
    }

    return `${newNamedGraph} ${oldNamedGraph}`
}

getOldNewNGFromAlias().then((data) => {
    console.log(data)
})
