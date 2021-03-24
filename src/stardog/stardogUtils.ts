import { Connection } from 'stardog'

/**
 * Returns the local name of a string if exists, or its value.
 * The local name is defined as the split after the first '#',
 * or the split after the last '/', or the split after the last ':'.
 * If there is no local name, the original string is returned.
 * @param text a string (such as an IRI)
 */
export const getLocalName = (text: string) => {
    // See https://rdf4j.org/javadoc/latest/org/eclipse/rdf4j/model/IRI.html
    // Group 1: split after the first occurrence of the '#' character
    // Group 2: split after the last occurrence of the '/' character
    // Group 3: split after the last occurrence of the ':' character
    const match = text.match(/[^#\n]*#(.*)|.*\/(.*)|.*:(.*)/)
    return match ? match[1] || match[2] || match[3] || text : text
}

export interface QueryResponse {
    type: string
    value: string
}

export interface DbNameConnProps {
    dbName: string
    conn: Connection
}
