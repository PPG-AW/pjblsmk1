import { describe, expect, it } from "vitest";
import { databaseFailure, isConnectionError } from "./db-error";
import { sanitizeConnectionUrl } from "./db-url";

describe("pengenalan galat koneksi database", () => {
  it("mengenali host/password salah dan endpoint yang tidak aktif", () => {
    const tenant = databaseFailure(new Error("(ENOTFOUND) tenant/user postgres.abcdef not found"));
    expect(tenant?.kind).toBe("unreachable");
    expect(tenant?.status).toBe(503);
    expect(tenant?.message).toContain("coba lagi");

    const refused = databaseFailure(new Error("connect ECONNREFUSED 3.106.102.114:5432"));
    expect(refused?.kind).toBe("unreachable");

    const auth = databaseFailure(new Error('password authentication failed for user "neondb_owner"'));
    expect(auth?.kind).toBe("unreachable");

    const disabled = databaseFailure(new Error("The endpoint has been disabled"));
    expect(disabled?.kind).toBe("unreachable");
  });

  it("pesan untuk pengguna memakai bahasa awam dan bisa ditindaklanjuti", () => {
    const failure = databaseFailure(new Error("timeout exceeded when trying to connect"));
    expect(failure?.message).toContain("coba lagi");
    expect(failure?.message).toContain("hubungi guru");
    // Tidak boleh ada istilah teknis di pesan yang dibaca siswa.
    expect(failure?.message).not.toMatch(/Neon|Postgres|database|server/i);
  });

  it("mengenali koneksi yang diputus pooler", () => {
    const lost = databaseFailure(new Error("Error: connection to client lost"));
    expect(lost?.kind).toBe("dropped");
    expect(lost?.status).toBe(503);
    expect(lost?.message).toContain("Coba sekali lagi");

    const terminated = databaseFailure(new Error("Connection terminated unexpectedly"));
    expect(terminated?.kind).toBe("dropped");

    const reset = databaseFailure(new Error("read ECONNRESET"));
    expect(reset?.kind).toBe("dropped");
  });

  it("membaca pesan dari properti cause", () => {
    const wrapped = new Error("query failed", { cause: new Error("socket hang up") });
    expect(databaseFailure(wrapped)?.kind).toBe("dropped");
  });

  it("mengabaikan galat yang bukan masalah koneksi", () => {
    expect(databaseFailure(new Error("duplicate key value violates unique constraint"))).toBeNull();
    expect(databaseFailure(new Error('column "x" does not exist'))).toBeNull();
    expect(databaseFailure(undefined)).toBeNull();
    expect(isConnectionError(new Error("syntax error at or near SELECT"))).toBe(false);
  });

  it("mengenali galat batas koneksi pooler", () => {
    expect(databaseFailure(new Error("remaining connection slots are reserved"))?.kind).toBe("dropped");
    expect(databaseFailure(new Error("too many clients already"))?.kind).toBe("dropped");
  });
});

describe("pembersih string koneksi", () => {
  it("membiarkan URL tanpa parameter", () => {
    const url = "postgresql://neondb_owner:abc@ep-rasa-123-pooler.ap-southeast-1.aws.neon.tech/neondb";
    expect(sanitizeConnectionUrl(url)).toEqual({ url, removed: [] });
  });

  it("membuang channel_binding yang dikirim panel Neon", () => {
    const input =
      "postgresql://neondb_owner:abc@ep-rasa-123-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const result = sanitizeConnectionUrl(input);
    expect(result.url).toBe(
      "postgresql://neondb_owner:abc@ep-rasa-123-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(result.removed).toContain("channel_binding");
  });

  it("membuang parameter yang tidak dikenal agar postgres-js tidak gagal", () => {
    const input = "postgresql://user:pass@host:5432/db?foo=bar&target_session_attrs=read-write";
    const result = sanitizeConnectionUrl(input);
    expect(result.url).toBe("postgresql://user:pass@host:5432/db");
    expect(result.removed).toEqual(["foo", "target_session_attrs"]);
  });

  it("mempertahankan sslmode dan application_name", () => {
    const input = "postgresql://user:pass@host:5432/db?sslmode=require&application_name=dapursptldv&x=1";
    const result = sanitizeConnectionUrl(input);
    expect(result.url).toBe(
      "postgresql://user:pass@host:5432/db?sslmode=require&application_name=dapursptldv",
    );
  });

  it("membuang fragmen dan parameter kosong", () => {
    const input = "postgresql://user:pass@host:5432/db?&channel_binding=require#bagian";
    expect(sanitizeConnectionUrl(input).url).toBe("postgresql://user:pass@host:5432/db");
  });
});
