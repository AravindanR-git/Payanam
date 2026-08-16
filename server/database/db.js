import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(filename) {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

const tables = {
  users: readFile("users.json"),
  trips: readFile("trips.json"),
  participants: readFile("participants.json"),
  contributions: readFile("contributions.json"),
  expense_categories: readFile("expense_categories.json"),
  expense_items: readFile("expense_items.json"),
  places: readFile("places.json"),
  expenses: readFile("expenses.json"),
  activities: readFile("activities.json"),
  sync_log: readFile("sync_log.json"),
  device_sessions: readFile("device_sessions.json"),
};

function persist(tableName) {
  writeFile(`${tableName}.json`, tables[tableName]);
}

function now() {
  return new Date().toISOString();
}

const db = {
  users: {
    findAll: (sql, params) => {
      let data = [...tables.users];
      
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      
      return data;
    },
    findOne: (sql, params) => {
      const results = db.users.findAll(sql, params);
      return results[0] || null;
    },
    insert: (row) => {
      tables.users.push(row);
      persist("users");
      return row;
    },
    update: (id, updates) => {
      const index = tables.users.findIndex(row => row.id === id);
      if (index >= 0) {
        tables.users[index] = { ...tables.users[index], ...updates };
        persist("users");
        return tables.users[index];
      }
      return null;
    },
    delete: (id) => {
      const initialLength = tables.users.length;
      tables.users = tables.users.filter(row => row.id !== id);
      persist("users");
      return initialLength - tables.users.length;
    },
  },

  trips: {
    findAll: (sql, params) => {
      let data = [...tables.trips];
      
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      
      if (sql.includes("ORDER BY")) {
        const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const key = orderMatch[1];
          const dir = (orderMatch[2] || "ASC").toUpperCase();
          data.sort((a, b) => {
            const aVal = a[key] || "";
            const bVal = b[key] || "";
            if (dir === "DESC") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      
      if (sql.includes("LIMIT")) {
        const limitMatch = sql.match(/LIMIT (\d+)/);
        if (limitMatch) {
          data = data.slice(0, parseInt(limitMatch[1]));
        }
      }
      
      return data;
    },
    findOne: (sql, params) => {
      const results = db.trips.findAll(sql, params);
      return results[0] || null;
    },
    insert: (row) => {
      tables.trips.push(row);
      persist("trips");
      return row;
    },
    update: (id, updates) => {
      const index = tables.trips.findIndex(row => row.id === id);
      if (index >= 0) {
        tables.trips[index] = { ...tables.trips[index], ...updates };
        persist("trips");
        return tables.trips[index];
      }
      return null;
    },
    delete: (id) => {
      const initialLength = tables.trips.length;
      tables.trips = tables.trips.filter(row => row.id !== id);
      persist("trips");
      return initialLength - tables.trips.length;
    },
  },

  participants: {
    findAll: (sql, params) => {
      let data = [...tables.participants];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      return data;
    },
    findOne: (sql, params) => db.participants.findAll(sql, params)[0] || null,
    insert: (row) => { tables.participants.push(row); persist("participants"); return row; },
    update: (id, updates) => {
      const index = tables.participants.findIndex(row => row.id === id);
      if (index >= 0) { tables.participants[index] = { ...tables.participants[index], ...updates }; persist("participants"); return tables.participants[index]; }
      return null;
    },
    delete: (id) => { tables.participants = tables.participants.filter(row => row.id !== id); persist("participants"); return 1; },
  },

  contributions: {
    findAll: (sql, params) => {
      let data = [...tables.contributions];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      return data;
    },
    findOne: (sql, params) => db.contributions.findAll(sql, params)[0] || null,
    insert: (row) => { tables.contributions.push(row); persist("contributions"); return row; },
  },

  expense_categories: {
    findAll: (sql, params) => {
      let data = [...tables.expense_categories];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      if (sql.includes("ORDER BY")) {
        const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const key = orderMatch[1];
          const dir = (orderMatch[2] || "ASC").toUpperCase();
          data.sort((a, b) => {
            const aVal = a[key] || "";
            const bVal = b[key] || "";
            if (dir === "DESC") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      return data;
    },
    findOne: (sql, params) => db.expense_categories.findAll(sql, params)[0] || null,
    insert: (row) => { tables.expense_categories.push(row); persist("expense_categories"); return row; },
    update: (id, updates) => {
      const index = tables.expense_categories.findIndex(row => row.id === id);
      if (index >= 0) { tables.expense_categories[index] = { ...tables.expense_categories[index], ...updates }; persist("expense_categories"); return tables.expense_categories[index]; }
      return null;
    },
    delete: (id) => { tables.expense_categories = tables.expense_categories.filter(row => row.id !== id); persist("expense_categories"); return 1; },
  },

  expense_items: {
    findAll: (sql, params) => {
      let data = [...tables.expense_items];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      return data;
    },
    findOne: (sql, params) => db.expense_items.findAll(sql, params)[0] || null,
    insert: (row) => { tables.expense_items.push(row); persist("expense_items"); return row; },
    update: (id, updates) => {
      const index = tables.expense_items.findIndex(row => row.id === id);
      if (index >= 0) { tables.expense_items[index] = { ...tables.expense_items[index], ...updates }; persist("expense_items"); return tables.expense_items[index]; }
      return null;
    },
    delete: (id) => { tables.expense_items = tables.expense_items.filter(row => row.id !== id); persist("expense_items"); return 1; },
  },

  places: {
    findAll: (sql, params) => {
      let data = [...tables.places];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      if (sql.includes("ORDER BY")) {
        const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const key = orderMatch[1];
          const dir = (orderMatch[2] || "ASC").toUpperCase();
          data.sort((a, b) => {
            const aVal = a[key] || "";
            const bVal = b[key] || "";
            if (dir === "DESC") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      return data;
    },
    findOne: (sql, params) => db.places.findAll(sql, params)[0] || null,
    insert: (row) => { tables.places.push(row); persist("places"); return row; },
    update: (id, updates) => {
      const index = tables.places.findIndex(row => row.id === id);
      if (index >= 0) { tables.places[index] = { ...tables.places[index], ...updates }; persist("places"); return tables.places[index]; }
      return null;
    },
    delete: (id) => { tables.places = tables.places.filter(row => row.id !== id); persist("places"); return 1; },
  },

  expenses: {
    findAll: (sql, params) => {
      let data = [...tables.expenses];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      if (sql.includes("ORDER BY")) {
        const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const key = orderMatch[1];
          const dir = (orderMatch[2] || "ASC").toUpperCase();
          data.sort((a, b) => {
            const aVal = a[key] || "";
            const bVal = b[key] || "";
            if (dir === "DESC") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      return data;
    },
    findOne: (sql, params) => db.expenses.findAll(sql, params)[0] || null,
    insert: (row) => { tables.expenses.push(row); persist("expenses"); return row; },
    update: (id, updates) => {
      const index = tables.expenses.findIndex(row => row.id === id);
      if (index >= 0) { tables.expenses[index] = { ...tables.expenses[index], ...updates }; persist("expenses"); return tables.expenses[index]; }
      return null;
    },
    delete: (id) => { tables.expenses = tables.expenses.filter(row => row.id !== id); persist("expenses"); return 1; },
  },

  activities: {
    findAll: (sql, params) => {
      let data = [...tables.activities];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      return data;
    },
    findOne: (sql, params) => db.activities.findAll(sql, params)[0] || null,
    insert: (row) => { tables.activities.push(row); persist("activities"); return row; },
  },

  sync_log: {
    findAll: (sql, params) => {
      let data = [...tables.sync_log];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      if (sql.includes("ORDER BY")) {
        const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const key = orderMatch[1];
          const dir = (orderMatch[2] || "ASC").toUpperCase();
          data.sort((a, b) => {
            const aVal = a[key] || "";
            const bVal = b[key] || "";
            if (dir === "DESC") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      return data;
    },
    findOne: (sql, params) => db.sync_log.findAll(sql, params)[0] || null,
    insert: (row) => { tables.sync_log.push(row); persist("sync_log"); return row; },
  },

  device_sessions: {
    findAll: (sql, params) => {
      let data = [...tables.device_sessions];
      if (sql.includes("WHERE")) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/);
        if (whereMatch) {
          const key = whereMatch[1];
          const value = params[0];
          data = data.filter(row => row[key] === value);
        }
      }
      return data;
    },
    findOne: (sql, params) => db.device_sessions.findAll(sql, params)[0] || null,
    insert: (row) => { tables.device_sessions.push(row); persist("device_sessions"); return row; },
    update: (id, updates) => {
      const index = tables.device_sessions.findIndex(row => row.id === id);
      if (index >= 0) { tables.device_sessions[index] = { ...tables.device_sessions[index], ...updates }; persist("device_sessions"); return tables.device_sessions[index]; }
      return null;
    },
    delete: (id) => { tables.device_sessions = tables.device_sessions.filter(row => row.id !== id); persist("device_sessions"); return 1; },
  },
};

export { db, now, uuidv4, bcrypt };
