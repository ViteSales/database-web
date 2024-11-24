import {connection} from "../database/connection.ts";
import type {IQueryable, IQueryableSource} from "../interface/queryable.ts";
import type {IDatabaseConnection} from "../interface/connection.ts";
import type {Knex} from "knex";
import {VS_TABLES} from "../constants";
import {onDatabaseError} from "../error/database.ts";

export class Queryable implements IQueryable {
	private db: Knex<any, unknown[]>;
	private tableMap!: Map<string, string>;
	constructor(conn: IDatabaseConnection) {
		const dbConn = connection(conn);
		if (dbConn instanceof Error) {
			throw dbConn;
		}
		this.db = dbConn;
	}
	
	init(): Promise<IQueryableSource> {
		return new Promise<IQueryableSource>(async (resolve, reject) => {
			try {
				this.tableMap = new Map<string, string>();
				const mapping = await this.db(VS_TABLES.TABLE_PER_MODULE);
				for (const mp of mapping) {
					this.tableMap.set(mp.module, mp.vs_schema);
				}
				resolve(this.db);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	tableSource(module: string): string | undefined {
		return this.tableMap.get(module);
	}
}