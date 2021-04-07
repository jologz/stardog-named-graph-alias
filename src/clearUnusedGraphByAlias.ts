import { Connection } from 'stardog'
import { namedGraphUtil } from './namedGraphUtil'

/**
 * Required arguments:
 * dbUsername
 * dbPassword
 * dbUrl
 * dbName
 * aliasName
 */
const clearUnusedGraphByAlias = async () => {
    const aliasNameArg = process.argv.find(
        (arg) => arg.indexOf('aliasName') > -1
    )
    const dbUserNameArg = process.argv.find(
        (arg) => arg.indexOf('dbUsername') > -1
    )
    const dbPasswordArg = process.argv.find(
        (arg) => arg.indexOf('dbPassword') > -1
    )
    const dbNameArg = process.argv.find((arg) => arg.indexOf('dbName') > -1)
    const dbUrlArg = process.argv.find((arg) => arg.indexOf('dbUrl') > -1)

    if (
        !dbUserNameArg ||
        !dbPasswordArg ||
        !dbUrlArg ||
        !dbNameArg ||
        !aliasNameArg
    ) {
        console.error('Error: Missing argument(s).')
        return
    }

    console.log('\n\n====== START: clearUnusedGraphByAlias =====')

    const aliasName = aliasNameArg.split('=')[1]
    const username = dbUserNameArg.split('=')[1]
    const password = dbPasswordArg.split('=')[1]
    const dbName = dbNameArg.split('=')[1]
    const endpoint = dbUrlArg.split('=')[1]

    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const {
        dropNamedGraph,
        getNamedGraphByAlias,
        getNamedGraphsByKeyword,
    } = namedGraphUtil({
        conn,
        dbName,
    })

    const namedGraphAliasResponse = await getNamedGraphByAlias(aliasName)
    if (!namedGraphAliasResponse.length) {
        console.log(`\nNo named graph found in ${aliasName}`)
        return
    }

    if (namedGraphAliasResponse.length > 1) {
        console.log(`\nFound 2 or more named graph in ${aliasName}. Exiting...`)
        return
    }

    const currentNamedGraph = namedGraphAliasResponse[0]

    if (currentNamedGraph.indexOf('_TS_') < 0) {
        console.log(`\nNamed graph doesn't have a timestamp.`)
        return
    }

    const namedGraphWithoutTimestamp = currentNamedGraph.substr(
        0,
        currentNamedGraph.indexOf('_TS_')
    )

    const namedGraphs = await getNamedGraphsByKeyword(
        namedGraphWithoutTimestamp
    )
    if (namedGraphs.length < 1) {
        console.log('Nothing was dropped.')
        return
    }

    // don't drop the current named graph
    const filteredNamedGraphs = namedGraphs.filter(
        (namedGraph) => namedGraph !== currentNamedGraph
    )

    if (filteredNamedGraphs.length === 0) {
        console.log(`\nThere is nothing to drop.`)
        return
    }

    for (const namedGraph of filteredNamedGraphs) {
        const dropNamedGraphSuccess = await dropNamedGraph(namedGraph)
        if (!dropNamedGraphSuccess) {
            console.log(`Failed to drop ${dropNamedGraph}`)
            return
        }
        console.log(`${namedGraph} dropped!`)
    }

    console.log('\n\n====== END: clearUnusedGraphByAlias =====')
}

clearUnusedGraphByAlias()
