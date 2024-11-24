import type {IAuditable} from "../interface/auditable.ts";
import type {KV} from "../types/kv.ts";
import type {Knex} from "knex";
import {connection} from "../database/connection.ts";
import type {IAuthenticatedSession} from "../interface/session.ts";
import {onDatabaseError} from "../error/database.ts";
import {VS_TABLES} from "../constants";

export class Auditable implements IAuditable {
	private readonly user: string;
	private db: Knex<any, unknown[]>;
	
	constructor(session: IAuthenticatedSession) {
		const dbConn = connection(session.database);
		if (dbConn instanceof Error) {
			throw dbConn;
		}
		this.user = session.user;
		this.db = dbConn;
	}
	
	delete(table: string, where: KV): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				const {realTable, prevData} = await this.getModuleAndPrevData(table, where);
				const returned = await this.db(realTable).update({ is_deleted: true }).where(where).returning("*");
				await this.insertLog(
					table,
					prevData,
					returned,
					"delete",
					where
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	deleteMany(table: string, where: KV[]): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				let prevData: any[] = [];
				const realTable = await this.getModule(table);
				for (const kv of where) {
					const dt = await this.db(realTable).where(kv);
					prevData = [...prevData, ...dt];
				}
				await this.db.transaction(async trx => {
					try {
						for (const kv of where) {
							await this.db(realTable).update({is_deleted: true}).where(kv).transacting(trx);
						}
						trx.commit();
					} catch (ex) {
						trx.rollback();
					}
				});
				let returned: any[] = [];
				for (const kv of where) {
					const dt = await this.db(realTable).where(kv);
					returned = [...returned, ...dt];
				}
				await this.insertLog(
					table,
					where,
					returned,
					"delete",
					where
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	insert(table: string, data: KV): Promise<any[]> {
		return this.insertMany(table, [data]);
	}
	
	insertMany(table: string, data: KV[]): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				const realTable = await this.getModule(table);
				const returned = await this.db(realTable).insert(data).returning("*");
				await this.insertLog(
					table,
					null,
					returned,
					"insert",
					data
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	update(table: string, data: KV, where: KV): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				const {realTable, prevData} = await this.getModuleAndPrevData(table, where);
				const returned = await this.db(realTable).update(data).where(where).returning("*");
				await this.insertLog(
					table,
					prevData,
					returned,
					"update",
					{data, where}
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	updateMany(table: string, data: KV[], where: KV[]): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				let prevData: any[] = [];
				const realTable = await this.getModule(table);
				for (const kv of where) {
					const dt = await this.db(realTable).where(kv);
					prevData = [...prevData, ...dt];
				}
				await this.db.transaction(async trx => {
					try {
						for (let i = 0; i < where.length; i++) {
							await this.db(realTable).update(data[i]).where(where[i]).transacting(trx);
						}
						trx.commit();
					} catch (ex) {
						trx.rollback();
					}
				});
				let returned: any[] = [];
				for (const kv of where) {
					const dt = await this.db(realTable).where(kv);
					returned = [...returned, ...dt];
				}
				await this.insertLog(
					table,
					prevData,
					returned,
					"update",
					{data, where}
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	private async insertLog(module: string, old_value: any, new_value: any, action: "delete" | "update" | "insert", metadata: any): Promise<void> {
		await this.db(VS_TABLES.AUDIT).insert({
			module,
			old_value,
			new_value,
			action,
			metadata,
			editor: this.user,
			created_at: new Date()
		});
	}
	
	private async getModuleAndPrevData(table: string, where: KV): Promise<{
		realTable: string;
		prevData: any;
	}> {
		return new Promise(async(resolve, reject)=>{
			try {
				const realTable = await this.getModule(table);
				const prev_data = await this.getPrevData(realTable, where);
				resolve({
					realTable: realTable,
					prevData: prev_data
				});
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	private async getModule(table: string): Promise<string> {
		return new Promise(async(resolve, reject)=>{
			try {
				const table_map = await this.db(VS_TABLES.TABLE_PER_MODULE).where({module: table}).first();
				resolve(table_map.vs_schema);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	private async getPrevData(table: string, where: KV): Promise<any> {
		return new Promise(async(resolve, reject)=>{
			try {
				const prev_data = await this.db(table).where(where);
				resolve(prev_data);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		})
	}
}