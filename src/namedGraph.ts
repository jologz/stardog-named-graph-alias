import prompt from 'prompt'
import { Connection, user } from 'stardog'
import { namedGraphUtil } from './namedGraphUtil'
import { commitChangesSchema } from './promptSchema'

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

    const {
        addDataToNamedGraph,
        addAliasesToNamedGraph,
        assignRolePermission,
        beginTransaction,
        commitTransaction,
        createDbReaderRole,
        dropNamedGraph,
        getAliases,
        getRoleList,
        getTotalTriples,
        getTotalTriplesInTransaction,
        getUserList,
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

    const dbNameReaderRole = `db_${dbName}_reader`
    console.log(`Creating ${dbNameReaderRole} role...`)
    await createDbReaderRole()
    console.log('Done!')

    console.log(`\nAdding permissions to ${dbNameReaderRole}...`)
    await assignRolePermission(dbNameReaderRole)
    console.log('Done!')

    console.log('\nGetting user lists...')
    const users = await getUserList()
    console.log(users.join('\n'))

    const nonAdmins = users.filter(
        (user) => user !== 'admin' && user !== 'anonymous'
    )

    console.log(`\nAdding users to ${dbNameReaderRole}`)
    for (const nonAdmin of nonAdmins) {
        await user.setRoles(conn, nonAdmin, [dbNameReaderRole])
        console.log(`${nonAdmin} has been added to ${dbNameReaderRole}`)
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
