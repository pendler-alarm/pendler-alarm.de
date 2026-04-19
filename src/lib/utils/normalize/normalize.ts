const EXTENSIONS = [
    '.svg',
    '.txt', '.md', '.json', '.xml', '.html', '.htm',
];

/**
 * normalize a filepath by removing leading slashes, leading './' and trailing extensions
 * @param {string} filePath the filepath to normalize
 * @returns {string} the normalized filepath
 */
export const normalizeFilePath = (filePath: string): string => {
    let result: string = filePath
        .replace(/^\.\//u, '')
        .replace(/^\/+/u, '')
    for (const ext of EXTENSIONS) {
        if (result.endsWith(ext)) {
            result = result.slice(0, -ext.length);
            break;
        }
    }
    return result;
};