import type {Knex} from "knex";

export async function isTableExists(db: Knex<any, unknown[]>, tableName: string): Promise<boolean> {
	const rows = await db.raw(`SELECT * FROM information_schema.tables WHERE table_name = '${tableName}'`);
	return rows.rowCount > 0;
}