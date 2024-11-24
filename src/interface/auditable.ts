import type {KV} from "../types/kv.ts";

export interface IAuditable {
	insert(table: string, data: KV): Promise<any[]>;
	insertMany(table: string, data: KV[]): Promise<any[]>;
	update(table: string, data: KV, where: KV): Promise<any[]>;
	updateMany(table: string, data: KV[], where: KV): Promise<any[]>;
	delete(table: string, where: KV): Promise<any[]>;
	deleteMany(table: string, where: KV[]): Promise<any[]>;
}