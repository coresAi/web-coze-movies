import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar, text, integer, numeric, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 影视作品库
export const mediaItems = pgTable(
	"media_items",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 255 }).notNull(),
		original_title: varchar("original_title", { length: 255 }),
		type: varchar("type", { length: 16 }).notNull(), // 'movie' / 'tv'
		year: integer("year"),
		director: varchar("director", { length: 255 }),
		actors: text("actors").array(),
		genre: text("genre").array(),
		region: varchar("region", { length: 64 }),
		description: text("description"),
		poster_url: text("poster_url"),
		backdrop_url: text("backdrop_url"),
		rating: numeric("rating", { precision: 3, scale: 1 }),
		douban_id: varchar("douban_id", { length: 32 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("media_items_title_idx").on(table.title),
		index("media_items_type_idx").on(table.type),
		uniqueIndex("media_items_douban_id_uq").on(table.douban_id),
	]
);

// 用户收藏与观看状态（按 device_id 隔离，无登录）
export const favorites = pgTable(
	"favorites",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		device_id: varchar("device_id", { length: 64 }).notNull(),
		media_id: uuid("media_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
		status: varchar("status", { length: 16 }).notNull().default("wish"), // wish/watching/watched/dropped
		personal_rating: integer("personal_rating"), // 1-5
		note: text("note"),
		progress: integer("progress").default(0), // 进度（集数/分钟数）
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("favorites_device_media_uq").on(table.device_id, table.media_id),
		index("favorites_device_id_idx").on(table.device_id),
		index("favorites_status_idx").on(table.status),
	]
);
