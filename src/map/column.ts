import type {IViteSalesSchemaProperty} from "../interface/vitesales-schema.ts";

export function columnMapping(dbType: string, table: any, propertiesKey: string, property: IViteSalesSchemaProperty): any {
	const column = (() => {
		switch (property.columnType) {
			case "bigint":
				return dbType === "pg" ? table.bigInteger(propertiesKey) : table.bigInteger(propertiesKey);
			case "bigserial":
				return dbType === "pg" ? table.bigIncrements(propertiesKey) : table.bigInteger(propertiesKey);
			case "bit":
				return dbType === "pg" ? table.specificType(propertiesKey, 'bit') : table.binary(propertiesKey);
			case "boolean":
				return table.boolean(propertiesKey);
			case "box":
				return dbType === "pg" ? table.specificType(propertiesKey, 'box') : table.string(propertiesKey, property.length);
			case "bytea":
				return table.binary(propertiesKey);
			case "character":
				return table.string(propertiesKey, 1);
			case "character varying":
				return table.string(propertiesKey);
			case "cidr":
				return dbType === "pg" ? table.specificType(propertiesKey, 'cidr') : table.string(propertiesKey,property.length);
			case "circle":
				return dbType === "pg" ? table.specificType(propertiesKey, 'circle') : table.string(propertiesKey,property.length);
			case "date":
				return table.date(propertiesKey);
			case "double precision":
				return table.double(propertiesKey);
			case "inet":
				return dbType === "pg" ? table.specificType(propertiesKey, 'inet') : table.string(propertiesKey,property.length);
			case "integer":
				return table.integer(propertiesKey);
			case "interval":
				return dbType === "pg" ? table.specificType(propertiesKey, 'interval') : table.integer(propertiesKey);
			case "json":
				return dbType === "pg" || dbType === 'mysql' ? table.json(propertiesKey) : table.string(propertiesKey,property.length);
			case "jsonb":
				return dbType === "pg" ? table.jsonb(propertiesKey) : table.json(propertiesKey);
			case "line":
				return dbType === "pg" ? table.specificType(propertiesKey, 'line') : table.string(propertiesKey,property.length);
			case "lseg":
				return dbType === "pg" ? table.specificType(propertiesKey, 'lseg') : table.string(propertiesKey,property.length);
			case "macaddr":
				return dbType === "pg" ? table.specificType(propertiesKey, 'macaddr') : table.string(propertiesKey,property.length);
			case "macaddr8":
				return dbType === "pg" ? table.specificType(propertiesKey, 'macaddr8') : table.string(propertiesKey,property.length);
			case "money":
				return dbType === "pg" ? table.specificType(propertiesKey, 'money') : table.decimal(propertiesKey, 19, 8);
			case "numeric":
				return table.decimal(propertiesKey, 19, 8);
			case "path":
				return dbType === "pg" ? table.specificType(propertiesKey, 'path') : table.string(propertiesKey,property.length);
			case "pg_lsn":
				return dbType === "pg" ? table.specificType(propertiesKey, 'pg_lsn') : table.string(propertiesKey,property.length);
			case "point":
				return dbType === "pg" ? table.specificType(propertiesKey, 'point') : table.string(propertiesKey,property.length);
			case "polygon":
				return dbType === "pg" ? table.specificType(propertiesKey, 'polygon') : table.string(propertiesKey,property.length);
			case "real":
				return table.float(propertiesKey);
			case "smallint":
				return table.smallint(propertiesKey);
			case "smallserial":
				return dbType === "pg" ? table.specificType(propertiesKey, 'smallserial') : table.smallint(propertiesKey);
			case "serial":
				return dbType === "pg" ? table.specificType(propertiesKey, 'serial') : table.integer(propertiesKey);
			case "text":
				return table.string(propertiesKey,property.length);
			case "time":
			case "time without time zone":
				return dbType === "pg" || dbType === 'mysql' ? table.time(propertiesKey) : table.string(propertiesKey,property.length);
			case "time with time zone":
				return dbType === "pg" ? table.specificType(propertiesKey, 'time with time zone') : table.time(propertiesKey);
			case "timestamp":
			case "timestamp without time zone":
				return table.timestamp(propertiesKey);
			case "timestamp with time zone":
				return dbType === "pg" ? table.timestamp(propertiesKey, {useTz: true}) : table.timestamp(propertiesKey);
			case "tsquery":
				return dbType === "pg" ? table.specificType(propertiesKey, 'tsquery') : table.text(propertiesKey);
			case "tsvector":
				return dbType === "pg" ? table.specificType(propertiesKey, 'tsvector') : table.text(propertiesKey);
			case "txid_snapshot":
				return dbType === "pg" ? table.specificType(propertiesKey, 'txid_snapshot') : table.string(propertiesKey,property.length);
			case "uuid":
				return table.uuid(propertiesKey);
			case "xml":
				return dbType === "pg" ? table.specificType(propertiesKey, 'xml') : table.text(propertiesKey);
			default:
				return table.string(propertiesKey,property.length);
		}
	})();
	if (typeof property.default !== "undefined") {
		column.defaultTo(property.default);
	}
	if (typeof property.nullable === "undefined") {
		column.nullable();
	} else if (property.nullable) {
		column.nullable();
	} else {
		column.notNullable();
	}
	if (property.isPrimaryKey) {
		column.primary();
	}
	return column;
}