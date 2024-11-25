import type {IAuditableTransaction, ITransactional} from "../interface/auditable.ts";
import type {KV} from "../types/kv.ts";
import  {type Auditable} from "./auditable.ts";
import type {Knex} from "knex";
import {v4 as uuid} from "uuid";
import {onDatabaseError} from "../error/database.ts";

export default class Transactional implements ITransactional{
	private auditableRecords: any[] = [];
	private transactionalFunctions: {
		id: string;
		transaction: Promise<any>;
	}[] = [];
	constructor(private db: Knex<any, unknown[]>, private trx: IAuditableTransaction, private audit: Auditable) {}
	
	async delete(table: string, where: KV): Promise<Transactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const id = uuid();
				const {realTable, prevData} = await this.audit.getModuleAndPrevData(table, where);
				this.transactionalFunctions.push({
					id,
					transaction: this.db(realTable).update({ is_deleted: true }).where(where)
						.transacting(this.trx)
				});
				this.auditableRecords.push({
					id,
					table,
					action: "delete",
					old_value: prevData,
					new_value: null,
					metadata: where
				});
				resolve(this);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	deleteMany(table: string, where: KV[]): Promise<ITransactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const id = uuid();
				const realTable = await this.audit.getModule(table);
				for (const kv of where) {
					const dt = await this.db(realTable).where(kv);
					this.auditableRecords.push({
						id,
						table,
						action: "delete",
						old_value: dt,
						new_value: null,
						metadata: kv
					});
					this.transactionalFunctions.push({
						id,
						transaction: this.db(realTable).update({is_deleted: true}).where(kv).transacting(this.trx)
					});
				}
				resolve(this);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	insert(table: string, data: KV): Promise<ITransactional> {
		return this.insertMany(table, [data]);
	}
	
	insertMany(table: string, data: KV[]): Promise<ITransactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const id = uuid();
				const realTable = await this.audit.getModule(table);
				this.transactionalFunctions.push({
					id,
					transaction: this.db(realTable).insert(data).transacting(this.trx)
				});
				this.auditableRecords.push({
					id,
					table,
					action: "insert",
					old_value: null,
					new_value: data,
					metadata: null
				});
				resolve(this);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	update(table: string, data: KV, where: KV): Promise<ITransactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const id = uuid();
				const {realTable, prevData} = await this.audit.getModuleAndPrevData(table, where);
				this.transactionalFunctions.push({
					id,
					transaction: this.db(realTable).update(data).where(where).transacting(this.trx)
				});
				this.auditableRecords.push({
					id,
					table,
					action: "update",
					old_value: prevData,
					new_value: data,
					metadata: where
				});
				resolve(this);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	updateMany(table: string, data: KV[], where: KV): Promise<ITransactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const id = uuid();
				const realTable = await this.audit.getModule(table);
				const dt = await this.db(realTable).where(where);
				data.forEach(d => {
					this.transactionalFunctions.push({
						id,
						transaction: this.db(realTable).update(d).where(where).transacting(this.trx)
					});
				});
				this.auditableRecords.push({
					id,
					table,
					action: "update",
					old_value: dt,
					new_value: data,
					metadata: where
				});
				resolve(this);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	commit(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const promises: any[] = [];
				for (const t of this.transactionalFunctions) {
					promises.push(t.transaction);
				}
				await Promise.all(promises);
				for (const auditableRecord of this.auditableRecords) {
					await this.audit.insertLog(
						auditableRecord.table,
						auditableRecord.old_value,
						auditableRecord.new_value,
						auditableRecord.action,
						auditableRecord.metadata
					);
				}
				resolve();
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
}