import prompt from 'prompt'
import { Connection } from 'stardog'
import DbSettings from './dbSettings'
import { namedGraphUtil } from './namedGraphUtil'
import { metadataSchema } from './promptSchema'
import Security from './security'

/**
 * STEPS:
 *
 * A. SECURITY
 *  1. Create DB roles (db_{dbName}_read & db_{dbName}_update).  Update role has (WRITE/DELETE)
 *  2. Add permissions to the DB roles from 1.a
 *  3. Create named graph (NG) default roles. (ng_{dbName}_default_read & ng_{dbName}_default_update)
 *      - When activating Stardog's (SD) NG Security, any "non-NG" triples are considered
 *      default NG (tag:stardog:api:context:default).  For users to still be able to read from it,
 *      a default NG role with read permission must be created
 *      - ONLY pelorus user can update default graph. Hence, ng_{dbName}_default_update role.
 *  4. Add permissions to the NG roles from 1.c
 *  5. Gets all named graphs
 *      - Since we will turn on NG Security, it is crucial for all users to still be able to access
 *      named graphs.  This app will create roles and read permissions to each NG.  Any existing
 *      NG will be skipped.
 *  6 Create read permission to all named graphs. FORMAT: ng_{dbName}_{graphRoleName}_read
 *      - graphRoleName is anything after https://nasa.gov/. It will convert "/" to "_"
 *      Example: https://nasa.gov/ontology => ng_decomp_ontology_read
 *      - https://nasa.gov/gateway/doors => ng_decomp_gateway_doors
 *  7. Creates ng_decomp_iasAsmtGraph_update role and permssion.
 *      - This is a special role for concourse.  concourse user can update iasAsmtGraph NG
 *  8. Gets all users, except admin and anonymous, and add all roles
 *      - Any users that can update will get the db_{dbName}_update automatically.  This is
 *      needed as base role to update the DB itself
 *      - pelorus will have ng_{dbName}_default_update
 *      - concourse will have ng_{dbName}_iasAsmyGraph_update
 *
 * B. DB SETTINGS
 *  1. Enables Graph Aliases if it hasn't been.
 *      - If the DB has this disabled, it will first take the DB offline and will turn it back
 *      once the update is finished.
 *      - This is needed for us to be able to read aliases.
 *      - Aliases security is deferred from the NG source.
 *  2. Enables Named Graph Security if it hasn't been.
 *      - This will not take the DB offline.
 *      - This will treat the DB as everything in Named Graph.  Read roles per NG is needed.
 *      - Any new NG must have a read role or else won't be read.
 *
 * C. FROM OLD NG TO NEW NG (Compass should populate new NG)
 *  1. Gets total amount of triples for both fomNamedGraph (old NG) to toNamedGraph (new NG)
 *  2. Copying triples from fromNamedGraph to toNamedGraph.
 *      - Since the toNamedGraph is a new NG without read permissions yet and the DB has
 *      NG Security turned ON, any triples in toNamedGraph won't be read by any users even
 *      if we add the current alias to the toNamedGraph.
 *      - This is just a simulation.  Compass will need to populate new NG.
 *  3. Adds aliasToUse to toNamedGraph
 *  4. Creates read role and permission for the toNamedGraph.
 *  5. Removes fromNamedGraph read role to each user while consecutively adding toNamedGraph read role.
 */

export const namedGraph = async () => {
    prompt.start()

    const {
        username,
        password,
        endpoint,
        dbName,
        fromNamedGraph,
        toNamedGraph,
        namedGraphDomain,
        aliasToUse,
    } = await prompt.get(metadataSchema)

    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const security = Security({
        conn,
        dbName,
        namedGraphDomain,
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
        addAliasToNamedGraph,
        getTotalTriples,
    } = namedGraphUtil({
        conn,
        dbName,
    })

    console.log(`\nGetting total triples of ${fromNamedGraph}...`)
    const fromNamedGraphTotalTriples = await getTotalTriples(fromNamedGraph)
    if (fromNamedGraphTotalTriples === null) return
    console.log(
        `${fromNamedGraphTotalTriples} total triples for ${fromNamedGraph}`
    )

    console.log(`\nGetting total triples of ${toNamedGraph}...`)
    const toNamedGraphTotalTriples = await getTotalTriples(toNamedGraph)
    if (toNamedGraphTotalTriples === null) return
    console.log(`${toNamedGraphTotalTriples} total triples for ${toNamedGraph}`)

    console.log(`\nAdding ${fromNamedGraph} to ${toNamedGraph}...`)
    const addDataResponse = await addDataToNamedGraph({
        fromNamedGraph,
        toNamedGraph,
    })
    if (!addDataResponse) {
        console.log(`Error adding triples to ${toNamedGraph}`)
        return
    }
    console.log(`Triples added to ${toNamedGraph} successfully!`)

    console.log(`\nGetting total triples of ${toNamedGraph}...`)
    const toNamedGraphFinalTotalTriples = await getTotalTriples(toNamedGraph)
    if (toNamedGraphFinalTotalTriples === null) return
    console.log(
        `${toNamedGraphFinalTotalTriples} final total triples for ${toNamedGraph}`
    )

    console.log(`\nAdding ${aliasToUse} to ${toNamedGraph}...`)
    const addAliasSuccess = await addAliasToNamedGraph({
        aliasName: aliasToUse,
        namedGraph: toNamedGraph,
    })
    if (!addAliasSuccess) {
        console.log(`Error adding ${aliasToUse} to ${toNamedGraph}`)
        return
    }
    console.log(`${toNamedGraph} is now using ${aliasToUse}`)

    console.log(`Creating read role for ${toNamedGraph}`)
    const newRole = await security.createReadRoleForNamedGraph(toNamedGraph)
    if (!newRole) {
        console.log(`Error creating read role for ${toNamedGraph}`)
        return
    }
    console.log(`${newRole} has been created.`)

    console.log(`Removing old read roles and adding new read roles to users...`)
    const successUpdatingUsers = await security.addNewReadRoleAndRemoveOldReadRoleFromUsers(
        {
            fromNamedGraph,
            newRole,
        }
    )

    if (successUpdatingUsers) {
        console.log(
            `\nSuccessfully updated!\nYou can now manually drop ${fromNamedGraph}`
        )
    }

    return
}
