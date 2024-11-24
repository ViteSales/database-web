import {createSlug} from "../utils";
import type {IViteSalesPackage} from "../interface/vitesales-schema.ts";
import {VS_TABLES} from "../constants";
import type {IDatabaseConnection} from "../interface/connection.ts";
import {connection} from "../database/connection.ts";
import {onDatabaseError} from "../error/database.ts";

export async function dbCreateUserForPackage(conn: IDatabaseConnection, pkgId: string): Promise<void> {
	return new Promise(async (resolve, reject)=>{
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try {
			const username = createSlug(pkgId);
			const password = `#<${pkgId}>#`;
			const userExists = await db("pg_roles")
				.select("rolname")
				.where("rolname", username)
				.first();
			if (!userExists) {
				await db.raw(`CREATE ROLE ${username} WITH LOGIN PASSWORD '${password}'`);
			}
			await db(VS_TABLES.PACKAGE_CREDENTIALS)
				.insert({
					package: pkgId,
					user: username,
					secret: password
				})
				.onConflict(["package","user"]).merge();
			resolve();
		} catch (e: any) {
			reject(onDatabaseError(e));
		}
	});
}

export async function dbPermitPackageUser(conn: IDatabaseConnection, pkg: IViteSalesPackage): Promise<void> {
	return new Promise(async (resolve, reject)=>{
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try {
			const username = createSlug(pkg.id);
			for (const module of pkg.modules) {
				for (const schema of module.properties.schemas) {
					const tableName = createSlug(`${module.id}_${schema.name}`);
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
			resolve();
		} catch (e: any) {
			reject(onDatabaseError(e));
		}
	});
}
