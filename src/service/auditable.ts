import type {KV} from "../types/kv.ts";
import type {Knex} from "knex";
import {onDatabaseError} from "../error/database.ts";
import {VS_TABLES} from "../constants";

export default class Auditable {
	
	constructor(private database: Knex<any, unknown[]>, private readonly user: string) {
	}
	
	public async insertLog(module: string, old_value: any, new_value: any, action: "delete" | "update" | "insert", metadata: any): Promise<void> {
		await this.database(VS_TABLES.AUDIT).insert({
			module,
			old_value,
			new_value,
			action,
			metadata,
			editor: this.user,
			created_at: new Date()
		});
	}
	
	public async getModuleAndPrevData(table: string, where: KV): Promise<{
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
	
	public async getModule(table: string): Promise<string> {
		return new Promise(async(resolve, reject)=>{
			try {
				const table_map = await this.database(VS_TABLES.TABLE_PER_MODULE).where({module: table}).first();
				resolve(table_map.vs_schema);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	public async getPrevData(table: string, where: KV): Promise<any> {
		return new Promise(async(resolve, reject)=>{
			try {
				const prev_data = await this.database(table).where(where);
				resolve(prev_data);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		})
	}
}