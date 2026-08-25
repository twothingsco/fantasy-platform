

import { parse } from 'csv-parse';
import type { Options } from 'csv-parse/lib/types'
import * as fs from 'fs';
import * as fse from 'fs-extra'; // For checking directory/file existence

/**
 * Reads and parses a CSV file.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<Array<Object>>} - An array of parsed CSV rows.
 */
export async function readCsv(filePath: string): Promise<Array<Record<string, any>>> {
    const results: Array<Record<string, any>> = [];

    // Check if the file exists before attempting to read it
    if (!(await fse.pathExists(filePath))) {
        throw new Error(`File not found: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(parse({ columns: true } as Options)) // Explicitly cast to Options to satisfy csv-parse types
            .on('data', (data: Record<string, any>) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`CSV parsing complete for ${filePath}. Rows: ${results.length}`);
                resolve(results);
            })
            .on('error', (error: Error) => {
                console.error('Error during CSV parsing:', error);
                reject(error);
            });
    })
};