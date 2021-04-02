import { query, user } from 'stardog'
import { DbNameConnProps, QueryResponse } from './stardog/stardogUtils'

export interface AddNewReadRoleAndRemoveOldReadRoleFromUsersProps {
    /** old named graph */
    oldNamedGraph: string
    /** new role name */
    newRole: string
}

export interface RoleNameResourceProps {
    action: user.Action
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
    const dbReadRoleName = `db_read`
    const dbWriteRoleName = `db_write`
    const ngDefaultReadRoleName = `ng_default_read`
    const ngDefaultWriteRoleName = `ng_default_write`
    const ngIasAsmtGraphWriteRoleName = `ng_iasAsmtGraph_write`

    // ngGroupRead are the passive named graphs bundled together
    const ngGroupReadRoleName = 'ng_group_read'
    const groupedNamedGraphs = [
        `${namedGraphDomain}ontology`,
        `${namedGraphDomain}mas`,
        `${namedGraphDomain}cradle`,
        `${namedGraphDomain}matLinks`,
        `${namedGraphDomain}iasAsmtGraph`,
        `${namedGraphDomain}iasGraph`,
        `${namedGraphDomain}iasTimeline`,
    ]

    const readRoles = [
        dbReadRoleName,
        ngDefaultReadRoleName,
        ngGroupReadRoleName,
    ]

    const addDbRolesAndPermissions = async () => {
        const dbReadSuccess = await addRoleAndPermission({
            action: 'READ',
            roleName: dbReadRoleName,
            resourceName: dbName,
            resourceType: 'db',
        })

        if (!dbReadSuccess) {
            return false
        }

        const dbWriteSuccess = await addRoleAndPermission({
            action: 'WRITE',
            roleName: dbWriteRoleName,
            resourceName: dbName,
            resourceType: 'db',
        })

        return dbWriteSuccess
    }

    const addNgDefaultRolesAndPermissions = async () => {
        const ngReadSuccess = await addRoleAndPermission({
            action: 'READ',
            roleName: ngDefaultReadRoleName,
            resourceName: `${dbName}\\tag:stardog:api:context:default`,
            resourceType: 'named-graph',
        })

        if (!ngReadSuccess) {
            return false
        }

        const ngUpdateSuccess = await addRoleAndPermission({
            action: 'WRITE',
            roleName: ngDefaultWriteRoleName,
            resourceName: `${dbName}\\tag:stardog:api:context:default`,
            resourceType: 'named-graph',
        })

        return ngUpdateSuccess
    }

    const addNgGroupRoleAndPermissions = async () => {
        const dbReadResponse = await addRole(ngGroupReadRoleName)

        if (dbReadResponse) {
            console.log(`\n${ngGroupReadRoleName} role created.`)
        } else {
            console.log(`\n${ngGroupReadRoleName} exists.`)
        }

        for (const groupNamedGraph of groupedNamedGraphs) {
            const addPermProps: RoleNameResourceProps = {
                action: 'READ',
                resourceName: `${dbName}\\${groupNamedGraph}`,
                resourceType: 'named-graph',
                roleName: ngGroupReadRoleName,
            }
            const addGroupedPermissionResponse = await addPermission(
                addPermProps
            )

            if (addGroupedPermissionResponse) {
                console.log(
                    `[${addPermProps.action}, ${addPermProps.resourceType}:${addPermProps.resourceName}] permission added to ${ngGroupReadRoleName}.`
                )
            } else {
                console.log(
                    `[${addPermProps.action}, ${addPermProps.resourceType}:${addPermProps.resourceName}] permission exists for ${ngGroupReadRoleName}.`
                )
            }
        }
    }

    const addNgIasAsmtGraphRoleWrite = async () => {
        console.log(`\nAdding iasAsmtGraph update role for concourse service.`)
        const ngUpdateSuccess = await addRoleAndPermission({
            action: 'WRITE',
            resourceName: `${dbName}\\${namedGraphDomain}iasAsmtGraph`,
            resourceType: 'named-graph',
            roleName: ngIasAsmtGraphWriteRoleName,
        })

        return ngUpdateSuccess
    }

    const addNewReadRoleAndRemoveOldReadRoleFromUsers = async ({
        oldNamedGraph,
        newRole,
    }: AddNewReadRoleAndRemoveOldReadRoleFromUsersProps) => {
        const oldRoleName = `ng_${getRoleName(oldNamedGraph)}_read`

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
                    // setting roles will remove previously added roles.
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
                        `\nError removing ${oldRoleName}. Please delete manually`
                    )
                } else {
                    console.log(`\n${oldRoleName} role has been removed.`)
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

    const addRole = async (name: string) => {
        const dbReadResponse = await user.role.create(conn, {
            name,
        })

        return dbReadResponse.ok
    }

    const addPermission = async ({
        action,
        roleName,
        resourceName,
        resourceType,
    }: RoleNameResourceProps) => {
        const dbReadPermResponse = await user.role.assignPermission(
            conn,
            roleName,
            {
                action,
                resourceType,
                resources: [resourceName],
            }
        )

        return dbReadPermResponse.ok
    }

    const addRoleAndPermission = async ({
        action,
        roleName,
        resourceName,
        resourceType,
    }: RoleNameResourceProps) => {
        try {
            const dbReadResponse = await addRole(roleName)

            if (dbReadResponse) {
                console.log(`\n${roleName} role created.`)
            } else {
                console.log(`\n${roleName} exists.`)
            }

            const dbReadPermResponse = await addPermission({
                action,
                roleName,
                resourceName,
                resourceType,
            })

            if (dbReadPermResponse) {
                console.log(
                    `[${action}, ${resourceType}:${resourceName}] permission added to ${roleName}.`
                )
            } else {
                console.log(
                    `[${action}, ${resourceType}:${resourceName}] permission exists for ${roleName}.`
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
        const roleName = `ng_${getRoleName(namedGraph)}_read`
        const newReadRoleSuccess = await addRoleAndPermission({
            action: 'READ',
            resourceName: `${dbName}\\${namedGraph}`,
            resourceType: 'named-graph',
            roleName,
        })

        return newReadRoleSuccess ? roleName : null
    }

    const getAllNamedGraphsAndCreateRoles = async () => {
        try {
            console.log(
                '\nGetting all remaining named graphs to create READ roles and permissions.'
            )

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
                .filter(
                    (graph) =>
                        graph.startsWith(namedGraphDomain) &&
                        !groupedNamedGraphs.includes(graph)
                )

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
        return fullGraphName.substr(namedGraphDomain.length).replace(/\//g, '_')
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
                                dbWriteRoleName,
                                ngDefaultWriteRoleName,
                            ]
                        )

                        if (!pelorusUpdateResponse.ok) {
                            console.log(
                                `${nonAdminUser} failed adding ${dbWriteRoleName} and ${ngDefaultWriteRoleName} roles.`
                            )
                        } else {
                            console.log(
                                `${dbWriteRoleName}\n${ngDefaultWriteRoleName}`
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
                                dbWriteRoleName,
                                ngIasAsmtGraphWriteRoleName,
                            ]
                        )

                        if (!pelorusUpdateResponse.ok) {
                            console.log(
                                `${nonAdminUser} failed adding ${dbWriteRoleName} and ${ngIasAsmtGraphWriteRoleName} roles.`
                            )
                        } else {
                            console.log(
                                `${dbWriteRoleName}\n${ngIasAsmtGraphWriteRoleName}`
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

        await addNgGroupRoleAndPermissions()

        const getAllNamedGraphSuccess = await getAllNamedGraphsAndCreateRoles()
        if (!getAllNamedGraphSuccess) return false

        const addNgIasAsmySuccess = await addNgIasAsmtGraphRoleWrite()
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
