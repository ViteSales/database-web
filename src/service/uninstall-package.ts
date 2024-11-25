import type {IDatabaseConnection} from "../interface/connection.ts";
import {connection} from "../database/connection.ts";
import {onDatabaseError} from "../error/database.ts";
import {VS_TABLES} from "../constants";
import {createSlug} from "../utils";

export async function dbUninstallPackage(conn: IDatabaseConnection, pkgId: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const db = connection(conn);
		if (db instanceof Error) {
			reject(db);
			return;
		}
		try {
			const username = createSlug(pkgId);
			const transactions: any[] = [];
			const tablesToDrop: string[] = [];
			const tables = await db(VS_TABLES.TABLE_PER_MODULE).where("package", pkgId);
			for (const row of tables) {
				tablesToDrop.push(row.vs_schema);
			}
			await db.transaction(async trx => {
				transactions.push(db(VS_TABLES.TABLE_PER_MODULE).where("package", pkgId).delete().transacting(trx));
				transactions.push(db(VS_TABLES.PACKAGE_PERMISSIONS).where("package", pkgId).delete().transacting(trx));
				transactions.push(db(VS_TABLES.PACKAGE_DEFINITIONS).where("package", pkgId).delete().transacting(trx));
				transactions.push(db(VS_TABLES.PACKAGE_CREDENTIALS).where("package", pkgId).delete().transacting(trx));
				transactions.push(db.raw(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM "${username}";`).transacting(trx));
				transactions.push(db.raw(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM "${username}";`).transacting(trx));
				transactions.push(db.raw(`REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM "${username}";`).transacting(trx));
				transactions.push(db.raw(`DROP ROLE IF EXISTS "${username}"`).transacting(trx));
				transactions.push(db.raw(`DROP USER IF EXISTS "${username}"`).transacting(trx));
				for (const table of tablesToDrop) {
					transactions.push(db.schema.dropTable(table).transacting(trx));
				}
				try {
					await Promise.all(transactions);
					trx.commit();
				} catch (e: any) {
					reject(onDatabaseError(e));
					trx.rollback();
					return;
				}
				resolve();
			});
		} catch (e: any) {
			reject(onDatabaseError(e));
			return;
		}
	});
}