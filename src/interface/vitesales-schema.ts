export interface IViteSalesPackage {
	id: string;
	name: string;
	version: string;
	description: string;
	author: string;
	license: string;
	modules: IViteSalesModule[];
}

export interface IViteSalesModule {
	id: string;
	label: string;
	icon: string;
	classNames: IViteSalesClassNames;
	properties: IViteSalesProperties;
}

export interface IViteSalesClassNames {
	label: string;
	icon: string;
}

export interface IViteSalesProperties {
	security: IViteSalesSecurity;
	implementations: IViteSalesImplementations;
	schemas: IViteSalesDatabaseSchema[];
	ui: IViteSalesUI[];
}

export interface IViteSalesSecurity {
	audit: boolean; // only for this module
	permissions: string[];
	roles: string[];
	dependencies: string[]; // modules. debtor.create-new, debtor.update
}

export interface IViteSalesImplementations {
	[method: string]: new () => any;
}

export interface IViteSalesDatabaseSchema {
	name: string;
	properties: Record<string, IViteSalesSchemaProperty>;
	unique?: string[];
	indexes?: string[];
}

export interface IViteSalesSchemaProperty {
	columnType: "bigint" | "bigserial" | "bit" | "boolean" | "box" | "bytea" | "character" | "character varying" | "cidr" | "circle" | "date" | "double precision" | "inet" | "integer" | "interval" | "json" | "jsonb" | "line" | "lseg" | "macaddr" | "macaddr8" | "money" | "numeric" | "path" | "pg_lsn" | "point" | "polygon" | "real" | "smallint" | "smallserial" | "serial" | "text" | "time" | "time with time zone" | "time without time zone" | "timestamp" | "timestamp with time zone" | "timestamp without time zone" | "tsquery" | "tsvector" | "txid_snapshot" | "uuid" | "xml";
	default?: any;
	isPrimaryKey?: boolean;
	nullable?: boolean;
	length?: number;
}

export interface IViteSalesUI {
	label: string;
	description?: string;
	icon?: string;
	classNames?: IViteSalesUIClassNames;
	view: IViteSalesUi
}

export interface IViteSalesUIClassNames {
	label: string;
	description: string;
	icon: string;
}

export type ViteSalesUiFieldType = "button" | "submit" | "badge" | "separator" | "switch" | "toggle" | "radio" | "select" | "input" | "calendar" | "table" | "label" | "paragraph" | "title" | "sub-title" | "caption" | "alert" | "icon" | "attachment" | "attachment[]" | "link" | "checkbox";
export type ViteSalesUiSourceType = "supplier" | "debtor" | "stock" | "account-types" | "standard-price" | "price-tags" | "stock-locations" | "agents";

export interface IViteSalesUiComponent {
	id: string;
	name?: string;
	type: ViteSalesUiFieldType | ViteSalesUiSourceType;
	className?: string;
	tooltip?: string;
	filterable?: boolean;
	validationSchema?: IViteSalesValidationSchema;
}

export interface IViteSalesValidationSchema {
	type: "string" | "number" | "boolean" | "object" | "array" | "null" | "any";
	min: any;
	max: any;
	regex: string;
	required: boolean;
	error: string;
}

export interface IViteSalesForm {
	id: string;
	onSubmit?: () => void;
}

export interface IViteSalesHStack extends IViteSalesForm {
	children: Array<IViteSalesUiComponent | IViteSalesHStack | IViteSalesVStack>;
	direction: "row";
}

export interface IViteSalesVStack extends IViteSalesForm {
	children: Array<IViteSalesUiComponent | IViteSalesHStack | IViteSalesVStack>;
	direction: "column";
}

export interface IViteSalesUi {
	root: IViteSalesHStack | IViteSalesVStack;
}
