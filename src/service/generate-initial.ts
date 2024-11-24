import {connection} from "../database/connection.ts";
import type {IDatabaseConnection} from "../interface/connection.ts";
import {DATABASE_VERSION} from "../version/database.ts";
import {onDatabaseError} from "../error/database.ts";
import {VS_TABLES} from "../constants";

export async function dbGenerateInitials(conn: IDatabaseConnection): Promise<void> {
	return new Promise(async (resolve, reject)=> {
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		if (await db.schema.hasTable(VS_TABLES.SCHEMA_VERSION)) {
			resolve();
			return;
		}
		const versionSchema = db.schema.createTable(VS_TABLES.SCHEMA_VERSION, table => {
			table.string("version", 15).primary();
		});
		const mappingSchema = db.schema.createTable(VS_TABLES.TABLE_PER_MODULE, table => {
			table.bigIncrements("id").primary();
			table.string("package",80);
			table.string("module",80);
			table.string("vs_schema",80).unique();
			table.string("package_version",15);
			table.unique(["package","module"]);
		});
		const auditSchema = db.schema.createTable(VS_TABLES.AUDIT, table => {
			table.bigIncrements("id").primary();
			table.string("module",80).index();
			table.json("old_value");
			table.json("new_value");
			table.string("editor",80).index();
			table.string("action",10);
			table.json("metadata");
			table.timestamp("created_at",{useTz: true});
		});
		const preferenceSchema = db.schema.createTable(VS_TABLES.MODULE_USER_PREFERENCE, table => {
			table.bigIncrements("id").primary();
			table.string("package",80).unique();
			table.string("module",80).index();
			table.json("preference");
			table.string("user",80);
		});
		const packagePermissions = db.schema.createTable(VS_TABLES.PACKAGE_PERMISSIONS, table => {
			table.bigIncrements("id").primary();
			table.string("package",80).unique();
			table.string("module",80).index();
			table.boolean("audit");
			table.json("permissions");
			table.json("roles");
			table.json("dependencies");
			table.unique(["package", "module"]);
		});
		const packageSchemaDefinitions = db.schema.createTable(VS_TABLES.PACKAGE_DEFINITIONS, table => {
			table.bigIncrements("id").primary();
			table.string("package_version",15);
			table.string("package",80);
			table.string("module",80);
			table.json("schema_definition");
			table.timestamp("updated_at",{useTz: true});
			table.unique(["package", "module"]);
		});
		const packageUserCredentials = db.schema.createTable(VS_TABLES.PACKAGE_CREDENTIALS, table => {
			table.bigIncrements("id").primary();
			table.string("package",80);
			table.string("user",80);
			table.string("secret",80);
			table.unique(["package", "user"]);
		});
		try {
			await Promise.all([
				versionSchema,
				mappingSchema,
				auditSchema,
				preferenceSchema,
				packagePermissions,
				packageSchemaDefinitions,
				packageUserCredentials
			]);
			await db(VS_TABLES.SCHEMA_VERSION).insert({version: DATABASE_VERSION});
			resolve();
		} catch (e: any) {
			await db.schema.dropTableIfExists(VS_TABLES.SCHEMA_VERSION);
			await db.schema.dropTableIfExists(VS_TABLES.TABLE_PER_MODULE);
			await db.schema.dropTableIfExists(VS_TABLES.AUDIT);
			await db.schema.dropTableIfExists(VS_TABLES.MODULE_USER_PREFERENCE);
			await db.schema.dropTableIfExists(VS_TABLES.PACKAGE_PERMISSIONS);
			await db.schema.dropTableIfExists(VS_TABLES.PACKAGE_DEFINITIONS);
			await db.schema.dropTableIfExists(VS_TABLES.PACKAGE_CREDENTIALS);
			reject(onDatabaseError(e));
		}
	});
}