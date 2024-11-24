import type {Knex} from "knex";

export interface IQueryableSource extends Knex<any, unknown[]> {}
export interface IQueryable {
	init(): Promise<IQueryableSource>;
	tableSource(module: string): string | undefined;
}