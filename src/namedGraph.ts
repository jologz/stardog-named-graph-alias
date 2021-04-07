import { Connection } from 'stardog'
import { namedGraphUtil } from './namedGraphUtil'
import { processEnv } from './processEnv'
import Security from './rolesAndPermissions/security'

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

    console.log('DATABASE_URL: ', endpoint)
    console.log('DATABASE_USERNAME: ', username)
    console.log('DATABASE_PASSWORD: ', password)
    console.log('NG_DBNAME: ', dbName)
    console.log('NG_ALIAS: ', aliasName)
    console.log('NG_OLD: ', oldNamedGraph)
    console.log('NG_NEW: ', newNamedGraph)

    const conn = new Connection({
        username,
        password,
        endpoint,
    })

    const { addAliasToNamedGraph, removeAliasFromNamedGraph } = namedGraphUtil({
        conn,
        dbName,
    })

    console.log(`\nAdding ${aliasName} to <${newNamedGraph}>...`)
    const addAliasSuccess = await addAliasToNamedGraph({
        aliasName,
        namedGraph: newNamedGraph,
    })
    if (!addAliasSuccess) {
        console.log(`Error adding ${aliasName} to <${newNamedGraph}>`)
        return
    }
    console.log(`<${newNamedGraph}> is now using ${aliasName}`)

    console.log(`\nRemoving ${aliasName} from <${oldNamedGraph}>`)
    const removeAliasSuccess = await removeAliasFromNamedGraph({
        aliasName,
        namedGraph: oldNamedGraph,
    })
    if (!removeAliasSuccess) {
        console.error(`Error removing ${aliasName} from <${oldNamedGraph}>`)
        return
    }

    console.log(`\nCreating read role for <${newNamedGraph}>`)
    const security = Security({
        conn,
        dbName,
    })

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
