import { query, user } from 'stardog'
import { DbNameConnProps, QueryResponse } from './stardog/stardogUtils'

export interface AddNewReadRoleAndRemoveOldReadRoleFromUsersProps {
    /** old named graph */
    fromNamedGraph: string
    /** new role name */
    newRole: string
}

export interface RoleNameResourceProps {
    roleName: string
    resourceName: string
    resourceType: user.ResourceType
}

export interface SecurityResponse {
    addNewReadRoleAndRemoveOldReadRoleFromUsers: (
        req: AddNewReadRoleAndRemoveOldReadRoleFromUsersProps
    ) => Promise<boolean>
    createReadRoleForNamedGraph: (namedGraph: string) => Promise<string | null>
    run: () => Promise<boolean>
}

export interface SecurityRequest extends DbNameConnProps {
    namedGraphDomain: string
}

const Security = ({
    dbName,
    conn,
    namedGraphDomain,
}: SecurityRequest): SecurityResponse => {
    const dbReadRoleName = `db_${dbName}_read`
    const dbUpdateRoleName = `db_${dbName}_update`
    const ngDefaultReadRoleName = `ng_${dbName}_default_read`
    const ngDefaultUpdateRoleName = `ng_${dbName}_default_update`
    const ngIasAsmtGraphUpdateRoleName = `ng_${dbName}_iasAsmtGraph_update`

    const readRoles = [dbReadRoleName, ngDefaultReadRoleName]

    const addDbRolesAndPermissions = async () => {
        const dbReadSuccess = await addReadRoleAndPermission({
            roleName: dbReadRoleName,
            resourceName: dbName,
            resourceType: 'db',
        })

        if (!dbReadSuccess) {
            return false
        }

        const dbUpdateSuccess = await addUpdateRoleAndPermission({
            roleName: dbUpdateRoleName,
            resourceName: dbName,
            resourceType: 'db',
        })

        return dbUpdateSuccess
    }

    const addNgDefaultRolesAndPermissions = async () => {
        const ngReadSuccess = await addReadRoleAndPermission({
            roleName: ngDefaultReadRoleName,
            resourceName: `${dbName}\\tag:stardog:api:context:default`,
            resourceType: 'named-graph',
        })

        if (!ngReadSuccess) {
            return false
        }

        const ngUpdateSuccess = await addUpdateRoleAndPermission({
            roleName: ngDefaultUpdateRoleName,
            resourceName: `${dbName}\\tag:stardog:api:context:default`,
            resourceType: 'named-graph',
        })

        return ngUpdateSuccess
    }

    const addNgIasAsmtGraphRoleUpdate = async () => {
        console.log(`\nAdding iasAsmtGraph update role for concourse service.`)
        const ngUpdateSuccess = await addUpdateRoleAndPermission({
            resourceName: `${dbName}\\${namedGraphDomain}iasAsmtGraph`,
            resourceType: 'named-graph',
            roleName: ngIasAsmtGraphUpdateRoleName,
        })

        return ngUpdateSuccess
    }

    const addNewReadRoleAndRemoveOldReadRoleFromUsers = async ({
        fromNamedGraph,
        newRole,
    }: AddNewReadRoleAndRemoveOldReadRoleFromUsersProps) => {
        const oldRoleName = `ng_${dbName}_${getRoleName(fromNamedGraph)}_read`

        try {
            const usersResponse = await user.list(conn)
            if (!usersResponse.ok) {
                console.error('Error getting users.')
                return false
            }

            const users = usersResponse.body.users as string[]
            const nonAdminAnonymousUsers = users.filter(
                (user) => user !== 'admin' && user !== 'anonymous'
            )
            try {
                for (const nonAdminUser of nonAdminAnonymousUsers) {
                    // setting roles will remove previoulsy added roles.
                    // get the current roles and add new roles

                    const nonAdminUserRolesResponse = await user.listRoles(
                        conn,
                        nonAdminUser
                    )

                    if (!nonAdminUserRolesResponse.ok) {
                        throw new Error(`Error getting ${nonAdminUser} roles.`)
                    }

                    const currentRoles = nonAdminUserRolesResponse.body
                        .roles as string[]

                    const removedOldRoles = currentRoles.filter(
                        (currentRole) => currentRole !== oldRoleName
                    )

                    const updatedRoles = [...removedOldRoles, newRole]

                    const addUserReadRoleResponse = await user.setRoles(
                        conn,
                        nonAdminUser,
                        updatedRoles
                    )

                    if (!addUserReadRoleResponse.ok) {
                        console.log(
                            `\n${nonAdminUser} failed adding read roles.`
                        )
                    } else {
                        console.log(
                            `\n${nonAdminUser} roles:\n${updatedRoles.join(
                                '\n'
                            )}`
                        )
                    }
                }

                const removeOldRoleResponse = await user.role.remove(
                    conn,
                    oldRoleName
                )
                if (!removeOldRoleResponse.ok) {
                    console.error(
                        `Error removing ${oldRoleName}. Please delete manually`
                    )
                } else {
                    console.log(`${oldRoleName} role has been removed.`)
                }
            } catch (e) {
                console.error(e)
                return false
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    }

    const addReadRoleAndPermission = async ({
        roleName,
        resourceName,
        resourceType,
    }: RoleNameResourceProps) => {
        try {
            const dbReadResponse = await user.role.create(conn, {
                name: roleName,
            })

            if (dbReadResponse.ok) {
                console.log(`\n${roleName} role created.`)
            } else {
                console.log(`\n${roleName} exists.`)
            }

            const dbReadPermResponse = await user.role.assignPermission(
                conn,
                roleName,
                {
                    action: 'READ',
                    resourceType,
                    resources: [resourceName],
                }
            )

            if (dbReadPermResponse.ok) {
                console.log(
                    `[READ, ${resourceType}:${resourceName}] permission added to ${roleName}.`
                )
            } else {
                console.log(
                    `[READ, ${resourceType}:${resourceName}] permission exists for ${roleName}.`
                )
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    }

    const addUpdateRoleAndPermission = async ({
        roleName,
        resourceName,
        resourceType,
    }: RoleNameResourceProps) => {
        try {
            const dbUpdateResponse = await user.role.create(conn, {
                name: roleName,
            })

            if (dbUpdateResponse.ok) {
                console.log(`\n${roleName} role created.`)
            } else {
                console.log(`\n${roleName} exists.`)
            }

            const dbWritePermResponse = await user.role.assignPermission(
                conn,
                roleName,
                {
                    action: 'WRITE',
                    resourceType,
                    resources: [resourceName],
                }
            )

            if (dbWritePermResponse.ok) {
                console.log(
                    `[WRITE, ${resourceType}:${resourceName}] permission added to ${roleName}.`
                )
            } else {
                console.log(
                    `[WRITE, ${resourceType}:${resourceName}] permission exists for ${roleName}.`
                )
            }

            const dbDeletePermResponse = await user.role.assignPermission(
                conn,
                roleName,
                {
                    action: 'DELETE',
                    resourceType,
                    resources: [resourceName],
                }
            )

            if (dbDeletePermResponse.ok) {
                console.log(
                    `[DELETE, ${resourceType}:${resourceName}] permission added to ${roleName}.`
                )
            } else {
                console.log(
                    `[DELETE, ${resourceType}:${resourceName}] permission exists for ${roleName}.`
                )
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    }

    const createReadRoleForNamedGraph = async (
        namedGraph: string
    ): Promise<string | null> => {
        const roleName = `ng_${dbName}_${getRoleName(namedGraph)}_read`
        const newReadRoleSuccess = await addReadRoleAndPermission({
            resourceName: `${dbName}\\${namedGraph.replace(/[<>]+/g, '')}`,
            resourceType: 'named-graph',
            roleName,
        })

        return newReadRoleSuccess ? roleName : null
    }

    const getAllNamedGraphsAndCreateRoles = async () => {
        try {
            console.log('\nGetting all named graphs to create READ roles.')
            const thisResp = await query.execute(
                conn,
                dbName,
                `
                SELECT ?graph {
                    GRAPH ?graph {}
                }
            `
            )

            if (!thisResp.ok) {
                console.error('Error getting graphs')
                return false
            }

            const graphs = thisResp.body.results.bindings as {
                graph: QueryResponse
            }[]

            // get only nasa named graphs
            const namedGraphs = graphs
                .map(({ graph }) => graph.value)
                .filter((graph) => graph.startsWith(namedGraphDomain))

            console.log('\nNamed Graphs:')
            console.log(namedGraphs.join('\n'))

            console.log('\nCreating READ roles and permissions.')
            try {
                for (const graph of namedGraphs) {
                    const successRoleName = await createReadRoleForNamedGraph(
                        graph
                    )
                    if (!successRoleName) {
                        throw new Error(
                            `Error adding read role for graph <${graph}>`
                        )
                    }

                    readRoles.push(successRoleName)
                }
            } catch (e) {
                console.error(e)
                return false
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    }

    const getRoleName = (fullGraphName: string) => {
        return fullGraphName
            .replace(/[<>]+/g, '')
            .substr(namedGraphDomain.length)
            .replace(/\//g, '_')
    }

    const getUsersAndAddRoles = async () => {
        console.log(
            `\nAdding roles to users except for admins and/or anonymous.`
        )
        try {
            const usersResponse = await user.list(conn)
            if (!usersResponse.ok) {
                console.error('Error getting users.')
                return false
            }

            const users = usersResponse.body.users as string[]
            const nonAdminAnonymousUsers = users.filter(
                (user) => user !== 'admin' && user !== 'anonymous'
            )

            try {
                for (const nonAdminUser of nonAdminAnonymousUsers) {
                    // setting roles will remove previoulsy added roles.
                    // get the current roles and add new roles

                    const nonAdminUserRolesResponse = await user.listRoles(
                        conn,
                        nonAdminUser
                    )

                    if (!nonAdminUserRolesResponse.ok) {
                        throw new Error(`Error getting ${nonAdminUser} roles.`)
                    }

                    const currentRoles = nonAdminUserRolesResponse.body
                        .roles as string[]

                    const addUserReadRoleResponse = await user.setRoles(
                        conn,
                        nonAdminUser,
                        [...currentRoles, ...readRoles]
                    )

                    if (!addUserReadRoleResponse.ok) {
                        console.log(
                            `\n${nonAdminUser} failed adding read roles.`
                        )
                    } else {
                        console.log(
                            `\n${nonAdminUser} roles:\n${readRoles.join('\n')}`
                        )
                    }

                    // Only pelorus service can update default graph
                    if (nonAdminUser === 'pelorus') {
                        const pelorusUpdateResponse = await user.setRoles(
                            conn,
                            nonAdminUser,
                            [
                                ...currentRoles,
                                ...readRoles,
                                dbUpdateRoleName,
                                ngDefaultUpdateRoleName,
                            ]
                        )

                        if (!pelorusUpdateResponse.ok) {
                            console.log(
                                `${nonAdminUser} failed adding ${dbUpdateRoleName} and ${ngDefaultUpdateRoleName} roles.`
                            )
                        } else {
                            console.log(
                                `${dbUpdateRoleName}\n${ngDefaultUpdateRoleName}`
                            )
                        }
                    }

                    // Only concourse service can update iasAsmtGraph
                    if (nonAdminUser === 'concourse') {
                        const pelorusUpdateResponse = await user.setRoles(
                            conn,
                            nonAdminUser,
                            [
                                ...currentRoles,
                                ...readRoles,
                                dbUpdateRoleName,
                                ngIasAsmtGraphUpdateRoleName,
                            ]
                        )

                        if (!pelorusUpdateResponse.ok) {
                            console.log(
                                `${nonAdminUser} failed adding ${dbUpdateRoleName} and ${ngIasAsmtGraphUpdateRoleName} roles.`
                            )
                        } else {
                            console.log(
                                `${dbUpdateRoleName}\n${ngIasAsmtGraphUpdateRoleName}`
                            )
                        }
                    }
                }
            } catch (e) {
                console.error(e)
                return false
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    }

    const run = async () => {
        console.log('Adding roles and permissions:')
        const addDbRolesAndPermissionsSuccess = await addDbRolesAndPermissions()
        if (!addDbRolesAndPermissionsSuccess) return false

        const addNgDefaultRolesAndPermissionsSuccess = await addNgDefaultRolesAndPermissions()
        if (!addNgDefaultRolesAndPermissionsSuccess) return false

        const getAllNamedGraphSuccess = await getAllNamedGraphsAndCreateRoles()
        if (!getAllNamedGraphSuccess) return false

        const addNgIasAsmySuccess = await addNgIasAsmtGraphRoleUpdate()
        if (!addNgIasAsmySuccess) return false

        const getUsersAndRolesSuccess = await getUsersAndAddRoles()
        if (!getUsersAndRolesSuccess) return false

        return true
    }

    return {
        addNewReadRoleAndRemoveOldReadRoleFromUsers,
        createReadRoleForNamedGraph,
        run,
    }
}

export default Security
