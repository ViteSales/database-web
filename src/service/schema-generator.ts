import type {IDatabaseConnection} from "../interface/connection.ts";
import type {
	IViteSalesPackage,
	IViteSalesDatabaseSchema,
	IViteSalesSchemaProperty
} from "../interface/vitesales-schema.ts";
import {connection} from "../database/connection.ts";
import {onDatabaseError} from "../error/database.ts";
import {createSlug} from "../utils";
import type {Knex} from "knex";
import {DATABASE_VERSION} from "../version/database.ts";

export async function generateSchema(conn: IDatabaseConnection, packages: Array<IViteSalesPackage>): Promise<Error[]> {
	const db = connection(conn);
	if (db instanceof Error) {
		return [db];
	}
	
	const err = await createInitialTables(db);
	if (err.length > 0) {
		return err;
	}
	
	const createSuccess = [] as {
		package_schema: string;
		vs_schema: string;
	}[];
	const errors = [] as Error[];
	for (const pkg of packages) {
		await createPackageUser(db, pkg.id);
		pkg.modules.forEach(mod => {
			mod.properties.schemas.forEach(async schema => {
				const tableName = createSlug(`${mod.id}_${schema.name}`);
				if (await db.schema.hasTable(tableName)) {
					const err = await updateSchema(conn.type || "pg", db, mod.id, schema);
					if (err.length > 0) {
						errors.push(...err);
					}
					return;
				}
				const tableBuilder = db.schema.createTable(tableName, table => {
					for (const propertiesKey in schema.properties) {
						const property = schema.properties[propertiesKey];
						table = columnMapping(conn.type || "pg", table, propertiesKey, property);
					}
					if (schema.indexes) {
						table.index(schema.indexes);
					}
					if (schema.unique) {
						table.unique(schema.unique);
					}
				});
				try {
					await tableBuilder;
					createSuccess.push({
						package_schema: schema.name,
						vs_schema: tableName,
					});
				} catch (e: any) {
					errors.push(onDatabaseError(e));
				}
			});
		});
		if (errors.length === 0) {
			try {
				await Promise.all(pkg.modules.map(async mod => {
					const defaultInserts = mod.properties.schemas.map(async schema => {
						await db("vs_schema_map").insert({
							package: pkg.id,
							module: schema.name,
							vs_schema: createSlug(`${mod.id}_${schema.name}`),
							package_version: pkg.version,
						});
					});
					for (const mm of pkg.modules) {
						defaultInserts.push(db("vs_package_permission").insert({
							package: pkg.id,
							module: mm.id,
							audit: true,
							permissions: JSON.stringify(mm.properties.security.permissions),
							roles: JSON.stringify(mm.properties.security.roles),
							dependencies: JSON.stringify(mm.properties.security.dependencies),
						}));
						defaultInserts.push(db("vs_package_definition").insert({
							package_version: pkg.version,
							package: pkg.id,
							module: mm.id,
							schema_definition: JSON.stringify(mm.properties.schemas)
						}));
						const username = createSlug(pkg.id);
						for (const ss of mm.properties.schemas) {
							const tableName = createSlug(`${mm.id}_${ss.name}`);
							await db.raw(`GRANT SELECT, UPDATE ON TABLE public.${tableName} TO ${username}`);
						}
						const dependencies = await db("vs_schema_map")
							.select("vs_schema")
							.whereIn("module",mm.properties.security.dependencies);
						for (const dependency of dependencies) {
							const {vs_schema_map} = dependency;
							await db.raw(`GRANT SELECT, UPDATE ON TABLE public.${vs_schema_map} TO ${username}`);
						}
					}
					await Promise.all(defaultInserts);
				}));
			} catch (e: any) {
				errors.push(onDatabaseError(e));
			}
		}
		if (errors.length > 0) {
			for (const table of createSuccess) {
				db.schema.dropTable(table.vs_schema);
			}
		}
	}
	return errors;
}

async function updateSchema(dbType: string, db: Knex<any, unknown[]>, modId: string, schema: IViteSalesDatabaseSchema): Promise<Error[]> {
	const errors = [] as Error[];
	const clonedTableName = createSlug(`${modId}_${schema.name}_cloned_${DATABASE_VERSION}`);
	const existingTableName = createSlug(`${modId}_${schema.name}`);
	
	try {
		await db.schema.createTableLike(clonedTableName, existingTableName);
		await db.raw(`INSERT INTO ${clonedTableName} SELECT * FROM ${existingTableName}`);
		const alterSchema = db.schema.alterTable(existingTableName, async table => {
			for (const propertiesKey in schema.properties) {
				const property = schema.properties[propertiesKey];
				if (!await db.schema.hasColumn(existingTableName, propertiesKey)) {
					table = columnMapping(dbType, table, propertiesKey, property);
				}
			}
		});
		await alterSchema;
		await db.schema.dropTable(clonedTableName);
	} catch (e: any) {
		errors.push(onDatabaseError(e));
	}
	if (errors.length > 0) {
		try {
			await db.schema.dropTable(existingTableName);
			await db.schema.renameTable(clonedTableName, existingTableName);
		} catch (e: any) {
			errors.push(onDatabaseError(e));
		}
	}
	return errors;
}

async function createInitialTables(db: Knex<any, unknown[]>): Promise<Error[]> {
	const errors = [] as Error[];
	if (await db.schema.hasTable("vs_schema_version")) {
		return errors;
	}
	const versionSchema = db.schema.createTable("vs_schema_version", table => {
		table.string("version", 15).primary();
	});
	const mappingSchema = db.schema.createTable("vs_schema_map", table => {
		table.bigIncrements("id").primary();
		table.string("package",80);
		table.string("module",80);
		table.string("vs_schema",80).unique();
		table.string("package_version",15);
		table.unique(["package","module"]);
	});
	const auditSchema = db.schema.createTable("vs_schema_audit", table => {
		table.bigIncrements("id").primary();
		table.string("module",80).index();
		table.json("old_value");
		table.json("new_value");
		table.string("editor",80).index();
		table.json("metadata");
		table.timestamp("created_at",{useTz: true});
	});
	const preferenceSchema = db.schema.createTable("vs_schema_preference", table => {
		table.bigIncrements("id").primary();
		table.string("package",80).unique();
		table.string("module",80).index();
		table.json("preference");
		table.string("user",80);
	});
	const packagePermissions = db.schema.createTable("vs_package_permission", table => {
		table.bigIncrements("id").primary();
		table.string("package",80).unique();
		table.string("module",80).index();
		table.boolean("audit");
		table.json("permissions");
		table.json("roles");
		table.json("dependencies");
		table.unique(["package", "module"]);
	});
	const packageSchemaDefinitions = db.schema.createTable("vs_package_definition", table => {
		table.bigIncrements("id").primary();
		table.string("package_version",15);
		table.string("package",80);
		table.string("module",80);
		table.json("schema_definition");
		table.timestamp("updated_at",{useTz: true});
		table.unique(["package", "module"]);
	});
	const packageUserCredentials = db.schema.createTable("vs_package_user_credentials", table => {
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
		await db("vs_schema_version").insert({version: DATABASE_VERSION});
	} catch (e: any) {
		db.schema.dropTableIfExists("vs_schema_version");
		db.schema.dropTableIfExists("vs_schema_map");
		db.schema.dropTableIfExists("vs_schema_audit");
		db.schema.dropTableIfExists("vs_schema_preference");
		db.schema.dropTableIfExists("vs_package_permission");
		db.schema.dropTableIfExists("vs_package_definitions");
		db.schema.dropTableIfExists("vs_package_user_credentials");
		return [onDatabaseError(e)];
	}
	return errors;
}

async function createPackageUser(db: Knex<any, unknown[]>, pkgId: string) {
	const username = createSlug(pkgId);
	const userExists = db('pg_roles')
		.select('rolname')
		.where('rolname', username)
		.first();
	if (!userExists) {
		const password = `#<${pkgId}>#`;
		await db.raw(`CREATE ROLE ${username} WITH LOGIN PASSWORD '${password}'`);
	}
}

function columnMapping(dbType: string, table: any, propertiesKey: string, property: IViteSalesSchemaProperty): any {
	const column = (() => {
		switch (property.columnType) {
			case "bigint":
				return dbType === "pg" ? table.bigInteger(propertiesKey) : table.bigInteger(propertiesKey);
			case "bigserial":
				return dbType === "pg" ? table.bigIncrements(propertiesKey) : table.bigInteger(propertiesKey);
			case "bit":
				return dbType === "pg" ? table.specificType(propertiesKey, 'bit') : table.binary(propertiesKey);
			case "boolean":
				return table.boolean(propertiesKey);
			case "box":
				return dbType === "pg" ? table.specificType(propertiesKey, 'box') : table.string(propertiesKey);
			case "bytea":
				return table.binary(propertiesKey);
			case "character":
				return table.string(propertiesKey, 1);
			case "character varying":
				return table.string(propertiesKey);
			case "cidr":
				return dbType === "pg" ? table.specificType(propertiesKey, 'cidr') : table.string(propertiesKey);
			case "circle":
				return dbType === "pg" ? table.specificType(propertiesKey, 'circle') : table.string(propertiesKey);
			case "date":
				return table.date(propertiesKey);
			case "double precision":
				return table.double(propertiesKey);
			case "inet":
				return dbType === "pg" ? table.specificType(propertiesKey, 'inet') : table.string(propertiesKey);
			case "integer":
				return table.integer(propertiesKey);
			case "interval":
				return dbType === "pg" ? table.specificType(propertiesKey, 'interval') : table.integer(propertiesKey);
			case "json":
				return dbType === "pg" || dbType === 'mysql' ? table.json(propertiesKey) : table.string(propertiesKey);
			case "jsonb":
				return dbType === "pg" ? table.jsonb(propertiesKey) : table.json(propertiesKey);
			case "line":
				return dbType === "pg" ? table.specificType(propertiesKey, 'line') : table.string(propertiesKey);
			case "lseg":
				return dbType === "pg" ? table.specificType(propertiesKey, 'lseg') : table.string(propertiesKey);
			case "macaddr":
				return dbType === "pg" ? table.specificType(propertiesKey, 'macaddr') : table.string(propertiesKey);
			case "macaddr8":
				return dbType === "pg" ? table.specificType(propertiesKey, 'macaddr8') : table.string(propertiesKey);
			case "money":
				return dbType === "pg" ? table.specificType(propertiesKey, 'money') : table.decimal(propertiesKey, 19, 8);
			case "numeric":
				return table.decimal(propertiesKey, 19, 8);
			case "path":
				return dbType === "pg" ? table.specificType(propertiesKey, 'path') : table.string(propertiesKey);
			case "pg_lsn":
				return dbType === "pg" ? table.specificType(propertiesKey, 'pg_lsn') : table.string(propertiesKey);
			case "point":
				return dbType === "pg" ? table.specificType(propertiesKey, 'point') : table.string(propertiesKey);
			case "polygon":
				return dbType === "pg" ? table.specificType(propertiesKey, 'polygon') : table.string(propertiesKey);
			case "real":
				return table.float(propertiesKey);
			case "smallint":
				return table.smallint(propertiesKey);
			case "smallserial":
				return dbType === "pg" ? table.specificType(propertiesKey, 'smallserial') : table.smallint(propertiesKey);
			case "serial":
				return dbType === "pg" ? table.specificType(propertiesKey, 'serial') : table.integer(propertiesKey);
			case "text":
				return table.text(propertiesKey);
			case "time":
			case "time without time zone":
				return dbType === "pg" || dbType === 'mysql' ? table.time(propertiesKey) : table.string(propertiesKey);
			case "time with time zone":
				return dbType === "pg" ? table.specificType(propertiesKey, 'time with time zone') : table.time(propertiesKey);
			case "timestamp":
			case "timestamp without time zone":
				return table.timestamp(propertiesKey);
			case "timestamp with time zone":
				return dbType === "pg" ? table.timestamp(propertiesKey, {useTz: true}) : table.timestamp(propertiesKey);
			case "tsquery":
				return dbType === "pg" ? table.specificType(propertiesKey, 'tsquery') : table.text(propertiesKey);
			case "tsvector":
				return dbType === "pg" ? table.specificType(propertiesKey, 'tsvector') : table.text(propertiesKey);
			case "txid_snapshot":
				return dbType === "pg" ? table.specificType(propertiesKey, 'txid_snapshot') : table.string(propertiesKey);
			case "uuid":
				return table.uuid(propertiesKey);
			case "xml":
				return dbType === "pg" ? table.specificType(propertiesKey, 'xml') : table.text(propertiesKey);
			default:
				return table.text(propertiesKey);
		}
	})();
	if (typeof property.default !== "undefined") {
		column.defaultTo(property.default);
	}
	if (typeof property.nullable === "undefined") {
		column.nullable();
	} else if (property.nullable) {
		column.nullable();
	} else {
		column.notNullable();
	}
	if (property.isPrimaryKey) {
		column.primary();
	}
	return column;
}