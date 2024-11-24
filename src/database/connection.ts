import type {Knex} from "knex";
import knex from "knex";
import type {IDatabaseConnection} from "../interface/connection.ts";
import {onDatabaseError} from "../error/database.ts";

export function connection(conn: IDatabaseConnection): Knex<any, unknown[]> | Error {
	const connOption = {
		host: conn.host,
		port: conn.port,
		user: conn.username,
		password: conn.password,
		database: conn.database,
		searchPath: []
	} as {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
		searchPath: string[] | undefined;
	};
	if (conn.type === "pg" && (conn.searchPath?.length || 0) > 0) {
		connOption.searchPath = conn.searchPath;
	} else {
		connOption.searchPath = undefined;
	}
	const db = knex({
		client: conn.type || "pg",
		connection: {
			...connOption,
			pool: {
				min: 3,
				max: 25
			},
		},
	}) as Knex<any, unknown[]>;
	try {
		db.raw("SELECT 1=1");
		db.on("query", query => console.log(query.sql));
		return db;
	} catch (error: any) {
		return onDatabaseError(error);
	}
}