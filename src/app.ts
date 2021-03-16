import { namedGraph } from './namedGraph'

const app = async () => {
    console.log('===== START =====')

    await namedGraph()

    console.log('====== END =======')
}

app()
