import type {IViteSalesDatabaseSchema, IViteSalesPackage} from "../interface/vitesales-schema.ts";
import {createSlug} from "../utils";
import {DATABASE_VERSION} from "../version/database.ts";
import {columnMapping} from "../map/column.ts";
import type {IDatabaseConnection} from "../interface/connection.ts";
import {connection} from "../database/connection.ts";
import {onDatabaseError} from "../error/database.ts";
import {isTableExists} from "../utils/database.ts";

export async function dbUpdatePackageSchema(conn: IDatabaseConnection, packages: Array<IViteSalesPackage>): Promise<void> {
	return new Promise(async (resolve, reject)=>{
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try{
			const schemas: Array<{
				tableName: string;
				schema: IViteSalesDatabaseSchema;
			}> = [];
			for (const pkg of packages) {
				for (const module of pkg.modules) {
					for (const schema of module.properties.schemas) {
						const tableName = createSlug(`${module.id}_${schema.name}`);
						if (await isTableExists(db, tableName)) {
							schemas.push({
								tableName,
								schema,
							});
						}
					}
				}
			}
			
			for (const {tableName, schema} of schemas) {
				const clonedTableName = createSlug(`${tableName}_cloned_${DATABASE_VERSION}`);
				const existingTableName = createSlug(`${tableName}`);
				if (await isTableExists(db, clonedTableName)) {
					await db.schema.dropTable(clonedTableName);
				}
				await db.schema.createTableLike(clonedTableName, existingTableName);
				await db.raw(`INSERT INTO ${clonedTableName} SELECT * FROM ${existingTableName}`);
				for (const propertiesKey in schema.properties) {
					const property = schema.properties[propertiesKey];
					if (!await db.schema.hasColumn(existingTableName, propertiesKey)) {
						await db.schema.alterTable(existingTableName, async table => {
							return columnMapping(conn.type || "pg" as string, table, propertiesKey, property);
						});
					}
				}
				await db.schema.dropTable(clonedTableName);
			}
			resolve();
		} catch (e: any) {
			reject(onDatabaseError(e));
		}
	});
}