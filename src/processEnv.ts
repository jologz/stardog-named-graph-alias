export const processEnv = () => {
    return {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_USERNAME: process.env.DATABASE_USERNAME,
        DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
        NG_DBNAME: process.env.NG_DBNAME,
        NG_ALIAS: process.env.NG_ALIAS,
        NG_OLD: process.env.NG_OLD,
        NG_NEW: process.env.NG_NEW,
    }
}
