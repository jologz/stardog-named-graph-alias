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
        fromNamedGraph: {
            message: 'Original named graph',
            default: '<https://nasa.gov/ontology>',
        },
        toNamedGraph: {
            message: 'New named graph',
            default: '<https://nasa.gov/newNg>',
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
