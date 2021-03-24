import prompt from 'prompt'
import { Connection } from 'stardog'
import DbSettings from './dbSettings'
import { namedGraphUtil } from './namedGraphUtil'
import { commitChangesSchema } from './promptSchema'
import Security from './security'

export const namedGraph = async () => {
    prompt.start()

    // const {
    //     username,
    //     password,
    //     endpoint,
    //     dbName,
    //     fromNamedGraph,
    //     toNamedGraph,
    // } = await prompt.get(metadataSchema)
    const {
        username,
        password,
        endpoint,
        dbName,
        fromNamedGraph,
        toNamedGraph,
    } = {
        username: 'admin',
        password: 'admin',
        endpoint: 'http://localhost:5820',
        dbName: 'decomp',
        fromNamedGraph: '<https://nasa.gov/ontology>',
        toNamedGraph: '<https://nasa.gov/newNg>',
    }

    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const security = Security({
        conn,
        dbName,
    })

    // Runs security related commands.
    const securitySuccess = await security.run()
    if (!securitySuccess) return

    // Check DB setup
    // We can now enable Named Graph Security
    // and check if Named Graph Alias is allowed.
    const dbSettings = DbSettings({
        conn,
        dbName,
    })
    const dbSettingsSuccess = await dbSettings.run()
    if (!dbSettingsSuccess) return

    // We are good to copy named graph to another named graph
    const {
        addDataToNamedGraph,
        addAliasesToNamedGraph,
        beginTransaction,
        commitTransaction,
        dropNamedGraph,
        getAliases,
        getTotalTriples,
        getTotalTriplesInTransaction,
        removeAliasesToNamedGraph,
    } = namedGraphUtil({
        conn,
        dbName,
    })

    const transactionId = await beginTransaction()

    if (!transactionId) {
        console.error('Error getting transaction Id.')
        return
    }

    const fromNamedGraphTotalTriples = await getTotalTriples(fromNamedGraph)
    if (fromNamedGraphTotalTriples === null) return
    console.log(
        `\n${fromNamedGraphTotalTriples} total triples for ${fromNamedGraph}`
    )

    const toNamedGraphTotalTriples = await getTotalTriples(toNamedGraph)
    if (toNamedGraphTotalTriples === null) return
    console.log(`${toNamedGraphTotalTriples} total triples for ${toNamedGraph}`)

    const aliases = await getAliases(fromNamedGraph)
    if (!aliases) return
    console.log(
        `\nFound ${aliases.length} alias${aliases.length === 1 ? '' : 'es'}:`
    )
    console.log(aliases.join('\n'))

    console.log(`\nAdding aliases to ${toNamedGraph}`)
    const addAliasesResponse = await addAliasesToNamedGraph({
        aliases,
        namedGraph: toNamedGraph,
    })
    if (addAliasesResponse !== aliases.length) {
        console.error('Error adding aliases.  Exiting...')
        return
    }
    console.log('Aliases added successfully.')

    console.log(`\nRemoving aliases to ${fromNamedGraph}`)
    const removeAliasesResponse = await removeAliasesToNamedGraph({
        aliases,
        namedGraph: fromNamedGraph,
    })
    if (removeAliasesResponse !== aliases.length) {
        console.error('Error removing aliases. Exiting...')
        return
    }
    console.log('Aliases removed successfully.')

    console.log(`\nAdding ${fromNamedGraph} to ${toNamedGraph}...`)
    const addDataResponse = await addDataToNamedGraph({
        fromNamedGraph,
        toNamedGraph,
    })
    if (!addDataResponse) return
    console.log(`Triples added to ${toNamedGraph} successfully!`)

    console.log(`\nDropping ${fromNamedGraph}...`)
    const dropResponse = await dropNamedGraph(fromNamedGraph)
    if (!dropResponse) return
    console.log(`${fromNamedGraph} dropped successfully!`)

    const fromNamedGraphTotalTriplesInTx = await getTotalTriplesInTransaction(
        fromNamedGraph
    )
    if (fromNamedGraphTotalTriplesInTx === null) return
    console.log(
        `\n${fromNamedGraphTotalTriplesInTx} total triples for ${fromNamedGraph}`
    )

    const toNamedGraphTotalTriplesInTx = await getTotalTriplesInTransaction(
        toNamedGraph
    )
    if (toNamedGraphTotalTriplesInTx === null) return
    console.log(
        `${toNamedGraphTotalTriplesInTx} total triples for ${toNamedGraph}`
    )

    console.log('\n')
    const { commitChanges } = await prompt.get(commitChangesSchema)

    if (commitChanges !== 'Y') {
        console.log('Changes cancelled, exiting.')
        return
    }

    const commitResponse = await commitTransaction()
    if (!commitResponse) return
    console.log('Changes committed successfully.')
}
