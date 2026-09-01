type RequiredColumn = {
  name: string;
  sql: string;
};

type SchedulesSchemaStatus = {
  requiredColumns: string[];
  existingColumns: string[];
  missingColumns: string[];
};

const REQUIRED_SCHEDULE_COLUMNS: RequiredColumn[] = [
  {
    name: "edit_token_hash",
    sql: "ALTER TABLE schedules ADD COLUMN edit_token_hash text",
  },
  {
    name: "rotation_config_json",
    sql: "ALTER TABLE schedules ADD COLUMN rotation_config_json text",
  },
  {
    name: "assignment_mode",
    sql: "ALTER TABLE schedules ADD COLUMN assignment_mode text",
  },
  {
    name: "design_theme_id",
    sql: "ALTER TABLE schedules ADD COLUMN design_theme_id text",
  },
  {
    name: "font_id",
    sql: "ALTER TABLE schedules ADD COLUMN font_id text",
  },
  {
    name: "is_public",
    sql: "ALTER TABLE schedules ADD COLUMN is_public integer DEFAULT 0 NOT NULL",
  },
];

let schemaReady = false;
let schemaReadyPromise: Promise<void> | null = null;

async function readSchedulesColumnNames(db: D1Database): Promise<string[]> {
  const tableInfo = await db
    .prepare("PRAGMA table_info(schedules)")
    .all<{ name: string }>();
  return (tableInfo.results ?? []).map(column => String(column.name));
}

export async function getSchedulesSchemaStatus(
  db: D1Database
): Promise<SchedulesSchemaStatus> {
  const existingColumns = await readSchedulesColumnNames(db);
  const existingColumnSet = new Set(existingColumns);
  const requiredColumns = REQUIRED_SCHEDULE_COLUMNS.map(column => column.name);
  const missingColumns = requiredColumns.filter(
    column => !existingColumnSet.has(column)
  );

  return {
    requiredColumns,
    existingColumns,
    missingColumns,
  };
}

export async function ensureSchedulesSchema(
  db: D1Database
): Promise<{ appliedColumns: string[] }> {
  if (schemaReady) return { appliedColumns: [] };
  if (schemaReadyPromise) {
    await schemaReadyPromise;
    return { appliedColumns: [] };
  }

  const appliedColumns: string[] = [];
  // 失敗した promise を残すと、D1 の一時エラー1回でこの isolate が生きている間ずっと
  // 同じエラーを返し続ける（DB が回復しても再試行されない）。失敗時は必ず捨てる。
  schemaReadyPromise = (async () => {
    const columnNames = new Set(await readSchedulesColumnNames(db));

    for (const column of REQUIRED_SCHEDULE_COLUMNS) {
      if (columnNames.has(column.name)) continue;

      try {
        await db.prepare(column.sql).run();
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.toLowerCase().includes("duplicate column")
        ) {
          throw error;
        }
      }

      columnNames.add(column.name);
      appliedColumns.push(column.name);
    }

    if (appliedColumns.length > 0) {
      console.warn("[schema] Auto-repaired schedules table", {
        appliedColumns,
      });
    }

    schemaReady = true;
  })().catch(error => {
    schemaReadyPromise = null;
    throw error;
  });

  await schemaReadyPromise;
  return { appliedColumns };
}
