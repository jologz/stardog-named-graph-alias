export const metadataSchema = {
    properties: {
        username: {
            message: "Stardog server's username",
            default: 'admin',
        },
        password: {
            message: "Stardog server's password",
            default: 'admin',
        },
        endpoint: {
            message: "Stardog server's URL",
            default: 'http://localhost:5820',
        },
        dbName: {
            message: 'Database name to use.',
            default: 'decomp',
        },
        namedGraphDomain: {
            message: 'Named graph domain.  Please include trailing /',
            default: 'https://nasa.gov/',
        },
        fromNamedGraph: {
            message: 'Original named graph',
            default: '<https://nasa.gov/matLinks>',
        },
        toNamedGraph: {
            message: 'New named graph',
            default: '<https://nasa.gov/new/matLinks>',
        },
        aliasToUse: {
            message: 'Alias to point the toNamedGraph',
            default: ':alias-matLinks',
        },
    },
}

export const commitChangesSchema = {
    properties: {
        commitChanges: {
            message: 'Do you want to commit changes? (Y/n)',
            required: true,
        },
    },
}
