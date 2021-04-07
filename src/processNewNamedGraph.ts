import { namedGraph } from './namedGraph'

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

export const app = async () => {
    console.log('\n\n===== START: processNewNamedGraph =====')
    await namedGraph()
    console.log('====== END: processNewNamedGraph =======')
}

app()
