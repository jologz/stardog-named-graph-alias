import { namedGraph } from './namedGraph'
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
 * STEPS:
 *
 * A. SECURITY
 *  1. Create DB roles (db_{dbName}_read & db_{dbName}_write).
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
 *      - concourse will have ng_{dbName}_iasAsmtGraph_update
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
const app = async () => {
    console.log('\n\n===== START =====')
    console.log('Environment Variables:')
    const {
        DATABASE_URL,
        DATABASE_USERNAME,
        DATABASE_PASSWORD,
        NG_DBNAME,
        NG_ALIAS,
        NG_OLD,
        NG_NEW,
    } = processEnv()
    console.log('DATABASE_URL: ', DATABASE_URL)
    console.log('DATABASE_USERNAME: ', DATABASE_USERNAME)
    console.log('DATABASE_PASSWORD: ', DATABASE_PASSWORD)
    console.log('NG_DBNAME: ', NG_DBNAME)
    console.log('NG_ALIAS: ', NG_ALIAS)
    console.log('NG_OLD: ', NG_OLD)
    console.log('NG_NEW: ', NG_NEW)

    await namedGraph()

    console.log('====== END =======')
}

app()
