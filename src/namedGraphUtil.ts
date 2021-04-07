import { query } from 'stardog'
import { DbNameConnProps } from './stardog/stardogUtils'

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

export interface NamedGraphUtilResponse {
    addAliasToNamedGraph: (req: AliasNamedGraphProps) => Promise<boolean>
    dropNamedGraph: (namedGraph: string) => Promise<boolean>
    getNamedGraphByAlias: (aliasName: string) => Promise<string[]>
    getNamedGraphsByKeyword: (keyword: string) => Promise<string[]>
    removeAliasFromNamedGraph: (req: AliasNamedGraphProps) => Promise<boolean>
}

export const namedGraphUtil = ({
    conn,
    dbName,
}: DbNameConnProps): NamedGraphUtilResponse => {
    const addAliasToNamedGraph = async ({
        aliasName,
        namedGraph,
    }: AliasNamedGraphProps) => {
        const addAliasQuery = `
            INSERT DATA {
                GRAPH <tag:stardog:api:graph:aliases> {
                ${aliasName} <tag:stardog:api:graph:alias> <${namedGraph}>
                }
            }
        `
        try {
            const aliasResponse = await query.execute(
                conn,
                dbName,
                addAliasQuery
            )

            return aliasResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    const dropNamedGraph = async (namedGraph: string) => {
        const dropNamedGraphQuery = `DROP GRAPH <${namedGraph}>`

        const dropNamedGraphResponse = await query.execute(
            conn,
            dbName,
            dropNamedGraphQuery
        )

        return dropNamedGraphResponse.ok
    }

    const getNamedGraphByAlias = async (aliasName: string) => {
        const namedGraphByAliasQuery = `
            SELECT ?namedGraph {
                GRAPH <tag:stardog:api:graph:aliases> {
                    ${aliasName} <tag:stardog:api:graph:alias> ?namedGraph
                }
            }
        `

        try {
            const namedGraphByAliasResponse = await query.execute(
                conn,
                dbName,
                namedGraphByAliasQuery
            )

            if (!namedGraphByAliasResponse.ok) {
                return []
            }

            const { bindings } = namedGraphByAliasResponse.body.results

            return bindings.map(
                (binding) => binding.namedGraph.value
            ) as string[]
        } catch (e) {
            console.error(e)
            return []
        }
    }

    const getNamedGraphsByKeyword = async (keyword: string) => {
        const namedGraphsByKeywordQuery = `
            SELECT ?namedGraph {
                GRAPH ?namedGraph {}
                FILTER REGEX(str(?namedGraph), "${keyword}", "i")
            }
        `

        try {
            const namedGraphsByKeywordResponse = await query.execute(
                conn,
                dbName,
                namedGraphsByKeywordQuery
            )

            if (!namedGraphsByKeywordResponse.ok) {
                return []
            }

            const { bindings } = namedGraphsByKeywordResponse.body.results

            return bindings.map(
                (binding) => binding.namedGraph.value
            ) as string[]
        } catch (e) {
            console.error(e)
            return []
        }
    }

    const removeAliasFromNamedGraph = async ({
        aliasName,
        namedGraph,
    }: AliasNamedGraphProps) => {
        const removeAliasQuery = `
            DELETE DATA {
                GRAPH <tag:stardog:api:graph:aliases> {
                ${aliasName} <tag:stardog:api:graph:alias> <${namedGraph}>
                }
            }
        `
        try {
            const aliasResponse = await query.execute(
                conn,
                dbName,
                removeAliasQuery
            )

            return aliasResponse.ok
        } catch (e) {
            console.error(e)
        }
        return false
    }

    return {
        addAliasToNamedGraph,
        dropNamedGraph,
        getNamedGraphByAlias,
        getNamedGraphsByKeyword,
        removeAliasFromNamedGraph,
    }
}
