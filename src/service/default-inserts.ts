import type {IViteSalesPackage} from "../interface/vitesales-schema.ts";
import {createSlug} from "../utils";
import {VS_TABLES} from "../constants";
import type {IDatabaseConnection} from "../interface/connection.ts";
import {connection} from "../database/connection.ts";
import {onDatabaseError} from "../error/database.ts";

export async function dbInsertDefaults(conn: IDatabaseConnection, packages: Array<IViteSalesPackage>): Promise<void> {
	return new Promise(async (resolve, reject)=>{
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try {
			const defaultInserts: Array<Promise<any>> = [];
			for (const pkg of packages) {
				pkg.modules.map(async mod => {
					for (const schema of mod.properties.schemas) {
						defaultInserts.push(db(VS_TABLES.TABLE_PER_MODULE).insert({
							package: pkg.id,
							module: schema.name,
							vs_schema: createSlug(`${mod.id}_${schema.name}`),
							package_version: pkg.version,
						}).onConflict(["package","module"]).merge());
					}
					for (const module of pkg.modules) {
						defaultInserts.push(db(VS_TABLES.PACKAGE_PERMISSIONS).insert({
							package: pkg.id,
							module: module.id,
							audit: true,
							permissions: JSON.stringify(module.properties.security.permissions),
							roles: JSON.stringify(module.properties.security.roles),
							dependencies: JSON.stringify(module.properties.security.dependencies),
						}).onConflict(["package","module"]).merge());
						defaultInserts.push(db(VS_TABLES.PACKAGE_DEFINITIONS).insert({
							package_version: pkg.version,
							package: pkg.id,
							module: module.id,
							schema_definition: JSON.stringify(module.properties.schemas),
							updated_at: new Date()
						}).onConflict(["package","module"]).merge());
						const username = createSlug(pkg.id);
						for (const ss of module.properties.schemas) {
							const tableName = createSlug(`${module.id}_${ss.name}`);
							await db.raw(`GRANT SELECT, UPDATE ON TABLE public.${tableName} TO ${username}`);
						}
						const dependencies = await db(VS_TABLES.TABLE_PER_MODULE)
							.select("vs_schema")
							.whereIn("module",module.properties.security.dependencies);
						for (const dependency of dependencies) {
							const {vs_schema_map} = dependency;
							await db.raw(`GRANT SELECT, UPDATE ON TABLE public.${vs_schema_map} TO ${username}`);
						}
					}
				});
			}
			await Promise.all(defaultInserts);
			resolve();
		} catch (e: any) {
			reject(onDatabaseError(e));
		}
	});
}