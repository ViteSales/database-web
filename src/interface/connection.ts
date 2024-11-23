export interface IDatabaseConnection {
	host: string;
	username: string;
	password: string;
	database: string;
	port: number;
	type?: "mysql" | "pg" | "sqlite3";
	searchPath?: string[];
}

