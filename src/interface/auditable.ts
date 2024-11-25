import type {KV} from "../types/kv.ts";
import type {Knex} from "knex";

export interface IAuditable {
	insert(table: string, data: KV): Promise<any[]>;
	insertMany(table: string, data: KV[]): Promise<any[]>;
	update(table: string, data: KV, where: KV): Promise<any[]>;
	updateMany(table: string, data: KV[], where: KV): Promise<any[]>;
	delete(table: string, where: KV): Promise<void>;
	deleteMany(table: string, where: KV[]): Promise<void>;
	transaction(): Promise<ITransactional>;
}
export interface ITransactional {
	commit(): Promise<void>;
	insert(table: string, data: KV): Promise<ITransactional>;
	insertMany(table: string, data: KV[]): Promise<ITransactional>;
	update(table: string, data: KV, where: KV): Promise<ITransactional>;
	updateMany(table: string, data: KV[], where: KV): Promise<ITransactional>;
	delete(table: string, where: KV): Promise<ITransactional>;
	deleteMany(table: string, where: KV[]): Promise<ITransactional>;
}
export interface IAuditableTransaction extends Knex.Transaction<any, any[]> {}