import type {IAuditable, ITransactional} from "../interface/auditable.ts";
import type {KV} from "../types/kv.ts";
import {onDatabaseError} from "../error/database.ts";
import type {Knex} from "knex";
import type {IAuthenticatedSession} from "../interface/session.ts";
import {connection} from "../database/connection.ts";
import {Auditable} from "./auditable.ts";
import Transactional from "./transactional.ts";

export class Crud extends Auditable implements IAuditable{
	private db: Knex<any, unknown[]>;
	
	constructor(session: IAuthenticatedSession) {
		const dbConn = connection(session.database);
		if (dbConn instanceof Error) {
			throw dbConn;
		}
		super(dbConn, session.user);
		this.db = dbConn;
	}
	
	delete(table: string, where: KV): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const {realTable, prevData} = await this.getModuleAndPrevData(table, where);
				await this.db(realTable).update({ is_deleted: true }).where(where);
				await this.insertLog(
					table,
					prevData,
					null,
					"delete",
					where
				);
				resolve();
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	deleteMany(table: string, where: KV[]): Promise<void> {
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
				await this.insertLog(
					table,
					where,
					null,
					"delete",
					where
				);
				resolve();
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
					null
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
					where
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	updateMany(table: string, data: KV[], where: KV): Promise<any[]> {
		return new Promise(async (resolve, reject) => {
			try {
				let prevData: any[] = [];
				const realTable = await this.getModule(table);
				let dt = await this.db(realTable).where(where);
				prevData = [...prevData, ...dt];
				
				await this.db.transaction(async trx => {
					try {
						for (let i = 0; i < where.length; i++) {
							await this.db(realTable).update(data[i]).where(where).transacting(trx);
						}
						trx.commit();
					} catch (ex) {
						trx.rollback();
					}
				});
				
				let returned: any[] = [];
				dt = await this.db(realTable).where(where);
				returned = [...returned, ...dt];
				
				await this.insertLog(
					table,
					prevData,
					returned,
					"update",
					where
				);
				resolve(returned);
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
	
	transaction(): Promise<ITransactional> {
		return new Promise(async (resolve, reject) => {
			try {
				const trx = await this.db.transaction();
				resolve(new Transactional(this.db, trx, this));
			} catch (e: any) {
				reject(onDatabaseError(e));
			}
		});
	}
}