import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";

let database: BetterSqlite3.Database | null = null;

function getDataDirectory(): string {
  const overrideDirectory = process.env.NOTEFLOW_DATA_DIR;
  if (!overrideDirectory) {
    throw new Error("NOTEFLOW_DATA_DIR must be set before initializing the database.");
  }

  return overrideDirectory;
}

function ensureMigrationsTable(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
}

function getMigrationsDirectory(): string {
  const isPackaged = process.env.NOTEFLOW_IS_PACKAGED === "true";
  const projectRootDirectory = process.env.NOTEFLOW_ROOT_DIR ?? process.cwd();
  if (isPackaged) {
    const packagedMigrationCandidates = [
      path.join(process.resourcesPath, "migrations"),
      path.join(projectRootDirectory, "electron", "db", "migrations"),
    ];
    const packagedMigrationDirectory = packagedMigrationCandidates.find((candidate) => fs.existsSync(candidate));

    if (!packagedMigrationDirectory) {
      throw new Error("Packaged migrations directory is missing from the expected application resources.");
    }

    return packagedMigrationDirectory;
  }

  const migrationsDirectory = path.join(projectRootDirectory, "electron", "db", "migrations");

  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error("Unable to locate the database migrations directory.");
  }

  return migrationsDirectory;
}

async function runMigrations(db: BetterSqlite3.Database): Promise<void> {
  ensureMigrationsTable(db);

  const migrationsDirectory = getMigrationsDirectory();
  const migrationFiles = (await fs.promises.readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const appliedMigrations = new Set(
    db
      .prepare("SELECT name FROM schema_migrations")
      .all()
      .map((row) => (row as { name: string }).name),
  );

  for (const migrationFile of migrationFiles) {
    if (appliedMigrations.has(migrationFile)) {
      continue;
    }

    const migrationSql = await fs.promises.readFile(path.join(migrationsDirectory, migrationFile), "utf8");
    const transaction = db.transaction(() => {
      db.exec(migrationSql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(migrationFile, Date.now());
    });

    transaction();
  }
}

export async function initializeDatabase(): Promise<BetterSqlite3.Database> {
  if (database) {
    return database;
  }

  const dataDirectory = getDataDirectory();
  fs.mkdirSync(dataDirectory, { recursive: true });

  const databasePath = path.join(dataDirectory, "noteflow.sqlite");
  database = new BetterSqlite3(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  await runMigrations(database);
  return database;
}

export function getDatabase(): BetterSqlite3.Database {
  if (!database) {
    throw new Error("Database has not been initialized yet.");
  }

  return database;
}
