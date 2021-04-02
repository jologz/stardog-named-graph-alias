import { Connection } from 'stardog'
import DbSettings from './dbSettings'
import { namedGraphUtil } from './namedGraphUtil'
import { processEnv } from './processEnv'
import Security from './security'

export const namedGraph = async () => {
    const {
        DATABASE_USERNAME: username,
        DATABASE_PASSWORD: password,
        DATABASE_URL: endpoint,
        NG_DBNAME: dbName,
        NG_ALIAS: aliasName,
        NG_OLD: oldNamedGraph,
        NG_NEW: newNamedGraph,
    } = processEnv()
    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const namedGraphDomain = 'https://nasa.gov/'

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

    const { addAliasToNamedGraph } = namedGraphUtil({
        conn,
        dbName,
    })

    console.log(`\nAdding ${aliasName} to <${newNamedGraph}>...`)
    const addAliasSuccess = await addAliasToNamedGraph({
        aliasName,
        namedGraph: newNamedGraph,
    })
    if (!addAliasSuccess) {
        console.log(`Error adding ${aliasName} to ${newNamedGraph}`)
        return
    }
    console.log(`<${newNamedGraph}> is now using ${aliasName}`)

    console.log(`Creating read role for <${newNamedGraph}>`)
    const newRole = await security.createReadRoleForNamedGraph(newNamedGraph)
    if (!newRole) {
        console.log(`Error creating read role for <${newNamedGraph}>`)
        return
    }
    console.log(`${newRole} has been created.`)

    console.log(`Removing old read roles and adding new read roles to users...`)
    const successUpdatingUsers = await security.addNewReadRoleAndRemoveOldReadRoleFromUsers(
        {
            oldNamedGraph,
            newRole,
        }
    )

    if (successUpdatingUsers) {
        console.log(
            `\nSuccessfully updated!\nYou can now manually drop ${oldNamedGraph}`
        )
    }

    return
}
