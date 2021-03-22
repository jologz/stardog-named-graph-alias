import { Connection, db, query, user } from 'stardog'
import { getLocalName } from './stardog/stardogUtils'

export interface FromToNamedGraphProps {
    fromNamedGraph: string
    toNamedGraph: string
}

export interface AliasNamedGraphProps {
    aliasName: string
    namedGraph: string
}

export interface AliasesNamedGraphProps {
    aliases: string[]
    namedGraph: string
}

export interface NamedGraphUtilProps {
    conn: Connection
    dbName: string
}

export interface NamedGraphUtilResponse {
    addDataToNamedGraph: (req: FromToNamedGraphProps) => Promise<boolean>
    addAliasesToNamedGraph: (req: AliasesNamedGraphProps) => Promise<number>
    assignRolePermission: (roleName: string) => Promise<void>
    beginTransaction: () => Promise<string>
    commitTransaction: () => Promise<boolean>
    createDbReaderRole: () => Promise<boolean>
    dropNamedGraph: (namedGraph: string) => Promise<boolean>
    getAliases: (namedGraph: string) => Promise<string[] | null>
    getRoleList: () => Promise<string[] | null>
    getTotalTriples: (namedGraph: string) => Promise<number | null>
    getTotalTriplesInTransaction: (namedGraph: string) => Promise<number | null>
    getUserList: () => Promise<string[] | null>
    removeAliasesToNamedGraph: (req: AliasesNamedGraphProps) => Promise<number>
}

export const namedGraphUtil = ({
    conn,
    dbName,
}: NamedGraphUtilProps): NamedGraphUtilResponse => {
    let transactionId: string = null

    const addDataToNamedGraph = async ({
        fromNamedGraph,
        toNamedGraph,
    }: FromToNamedGraphProps) => {
        const addDataQuery = `
            ADD ${fromNamedGraph} TO ${toNamedGraph}
        `
        try {
            const addDataResponse = await query.executeInTransaction(
                conn,
                dbName,
                transactionId,
                addDataQuery
            )
            return addDataResponse.ok
        } catch (e) {
            console.log(e)
        }
        return false
    }

    const addAliasToNamedGraph = async ({
        aliasName,
        namedGraph,
    }: AliasNamedGraphProps) => {
        const addAliasQuery = `
            INSERT DATA {
                GRAPH <tag:stardog:api:graph:aliases> {
                ${aliasName} <tag:stardog:api:graph:alias> ${namedGraph}
                }
            }
        `
        try {
            const aliasResponse = await query.executeInTransaction(
                conn,
                dbName,
                transactionId,
                addAliasQuery
            )

            return aliasResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    const addAliasesToNamedGraph = async ({
        aliases,
        namedGraph,
    }: AliasesNamedGraphProps) => {
        let successfulCount = 0
        for (const aliasName of aliases) {
            const addAliasResponse = await addAliasToNamedGraph({
                aliasName,
                namedGraph,
            })
            if (!addAliasResponse) {
                return
            }
            successfulCount++
        }

        return successfulCount
    }

    const assignRolePermission = async (roleName: string) => {
        await user.role.assignPermission(conn, roleName, {
            action: 'READ',
            resourceType: 'db',
            resources: [dbName],
        })

        await user.role.assignPermission(conn, roleName, {
            action: 'READ',
            resourceType: 'named-graph',
            resources: [`${dbName}\\tag:stardog:api:context:default`],
        })
    }

    const beginTransaction = async () => {
        try {
            const transResponse = await db.transaction.begin(conn, dbName)
            transactionId = transResponse.transactionId
            return transactionId
        } catch (e) {
            console.error(e)
        }

        return ''
    }

    const commitTransaction = async () => {
        try {
            const transResponse = await db.transaction.commit(
                conn,
                dbName,
                transactionId
            )
            return transResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    const createDbReaderRole = async () => {
        const response = await user.role.create(conn, {
            name: `db_${dbName}_reader`,
        })

        return response.ok
    }

    const dropNamedGraph = async (namedGraph: string) => {
        const dropNamedGraphQuery = `
            DROP GRAPH ${namedGraph}
        `

        try {
            const dropResponse = await query.executeInTransaction(
                conn,
                dbName,
                transactionId,
                dropNamedGraphQuery
            )
            return dropResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    const getAliases = async (namedGraph: string) => {
        const aliasesQuery = `
            SELECT ?aliasName {
                GRAPH stardog:graph:aliases {
                    ?aliasName stardog:graph:alias ${namedGraph}
                }
            }
        `

        try {
            const response = await query.execute(conn, dbName, aliasesQuery)
            if (!response.ok) return null

            const { bindings } = response.body.results

            return bindings.map(
                (binding) => `:${getLocalName(binding.aliasName.value)}`
            )
        } catch (e) {
            console.error(e)
            return null
        }
    }

    const getRoleList = async () => {
        const response = await user.role.list(conn)
        if (!response.ok) return null
        return response.body.roles as string[]
    }

    const getTotalTriples = async (namedGraph: string) => {
        const countQuery = `
            SELECT (COUNT(?p) as ?total) FROM ${namedGraph} {?s ?p ?o}
        `

        try {
            const response = await query.execute(conn, dbName, countQuery)
            if (!response.ok) return null

            const {
                total: { value },
            } = response.body.results.bindings[0]

            return Number(value)
        } catch (e) {
            console.error(e)
        }

        return null
    }

    const getTotalTriplesInTransaction = async (namedGraph: string) => {
        const countQuery = `
            SELECT (COUNT(?p) as ?total) FROM ${namedGraph} {?s ?p ?o}
        `

        try {
            const response = await query.executeInTransaction(
                conn,
                dbName,
                transactionId,
                countQuery
            )
            if (!response.ok) return null

            const {
                total: { value },
            } = response.body.results.bindings[0]

            return Number(value)
        } catch (e) {
            console.error(e)
        }

        return null
    }

    const getUserList = async () => {
        try {
            const response = await user.list(conn)
            if (!response.ok) return null
            return response.body.users as string[]
        } catch (e) {
            console.error(e)
        }
        return null
    }

    const removeAliasToNamedGraph = async ({
        aliasName,
        namedGraph,
    }: AliasNamedGraphProps) => {
        const removeAliasQuery = `
            DELETE DATA {
                GRAPH <tag:stardog:api:graph:aliases> {
                ${aliasName} <tag:stardog:api:graph:alias> ${namedGraph}
                }
            }
        `
        try {
            const aliasResponse = await query.executeInTransaction(
                conn,
                dbName,
                transactionId,
                removeAliasQuery
            )

            return aliasResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    const removeAliasesToNamedGraph = async ({
        aliases,
        namedGraph,
    }: AliasesNamedGraphProps) => {
        let successfulCount = 0
        for (const aliasName of aliases) {
            const removeAliasResponse = await removeAliasToNamedGraph({
                aliasName,
                namedGraph,
            })
            if (!removeAliasResponse) {
                return
            }
            successfulCount++
        }

        return successfulCount
    }

    return {
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
    }
}
