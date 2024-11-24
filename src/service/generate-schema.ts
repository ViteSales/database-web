import type {IDatabaseConnection} from "../interface/connection.ts";
import type {IViteSalesDatabaseSchema, IViteSalesPackage} from "../interface/vitesales-schema.ts";
import {connection} from "../database/connection.ts";
import {createSlug} from "../utils";
import {columnMapping} from "../map/column.ts";
import {onDatabaseError} from "../error/database.ts";
import {isTableExists} from "../utils/database.ts";

export async function dbGenerateSchema(conn: IDatabaseConnection, packages: Array<IViteSalesPackage>): Promise<void> {
	return new Promise(async (resolve, reject)=>{
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try {
			const dbOps = [];
			for (const pkg of packages) {
				for (const module of pkg.modules) {
					for (const schema of module.properties.schemas) {
						const tableName = createSlug(`${module.id}_${schema.name}`);
						if (!await isTableExists(db, tableName)) {
							dbOps.push(db.schema.createTable(tableName, table=>{
								for (const propertiesKey in schema.properties) {
									const property = schema.properties[propertiesKey];
									columnMapping(conn.type || "pg", table, propertiesKey, property);
								}
								if (schema.indexes) {
									table.index(schema.indexes);
								}
								if (schema.unique) {
									table.unique(schema.unique);
								}
							}));
						}
					}
				}
			}
			
			await Promise.all(dbOps);
			resolve();
		} catch (e: any) {
			reject(onDatabaseError(e));
			return;
		}
	});
}