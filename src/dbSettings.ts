import { db } from 'stardog'
import { DbNameConnProps } from './stardog/stardogUtils'

export interface DbSettingsResponse {
    run: () => Promise<boolean>
}

const DbSettings = ({ dbName, conn }: DbNameConnProps) => {
    const run = async () => {
        console.log(`\nChecking database setup.`)

        const metadataResp = await db.options.get(conn, dbName, {
            security: {
                named: { graphs: null },
            },
            graph: {
                aliases: null,
            },
        })

        if (!metadataResp.ok) {
            console.error('Error reading db metadata')
            return false
        }

        const {
            graph: { aliases: graphAliasesEnabled },
            security: {
                named: { graphs: namedGraphsSecurityEnabled },
            },
        } = metadataResp.body

        if (graphAliasesEnabled) {
            console.log(`Graph aliases are enabled for ${dbName}`)
        } else {
            console.log(
                `Graph aliases are not enabled.  Taking ${dbName} offline.`
            )
            const offlineResp = await db.offline(conn, dbName)
            if (!offlineResp.ok) {
                console.log('Error taking db offline.')
                return false
            }
            console.log(`${dbName} is now offline.`)
            console.log('Enabling Graph Aliases.')
            const graphAliasesResp = await db.options.set(conn, dbName, {
                graph: {
                    aliases: true,
                },
            })
            if (!graphAliasesResp.ok) {
                console.log('Error setting graph alias to true.')
                return false
            }
            console.log('Graph aliases are now enabled.')
            const onlineResp = await db.online(conn, dbName)
            if (!onlineResp.ok) {
                console.log('Error taking db online.')
                return false
            }
            console.log(`${dbName} is now back online.`)
        }

        if (namedGraphsSecurityEnabled) {
            console.log(`Named Graph Security is enabled for ${dbName}`)
        } else {
            const namedGraphSecResp = await db.options.set(conn, dbName, {
                security: {
                    named: {
                        graphs: true,
                    },
                },
            })

            if (!namedGraphSecResp.ok) {
                console.log('Error enabling named graph security.')
                return false
            }
            console.log(`Named Graph Security is now enabled for ${dbName}`)
        }

        return true
    }

    return {
        run,
    }
}

export default DbSettings
