// One-time move of business proofs out of the public `shop-documents` bucket
// into the private `shop-proofs` bucket, updating shops.business_proof_url.
//
// Run supabase/shop_proofs_private.sql first, then:
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-shop-proofs.mjs --dry-run
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-shop-proofs.mjs
//
// The service-role key (Supabase > Project Settings > API) bypasses RLS, so
// never commit it or put it in a VITE_ variable. Safe to re-run: shops already
// pointing at shop-proofs are skipped.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

function envFromFile(key) {
  try {
    const line = readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`));
    return line?.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
  } catch {
    return undefined;
  }
}

const url = process.env.VITE_SUPABASE_URL || envFromFile("VITE_SUPABASE_URL");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Need VITE_SUPABASE_URL (from .env) and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const PUBLIC_PREFIX = "/storage/v1/object/public/shop-documents/";

const { data: shops, error } = await sb
  .from("shops")
  .select("id, name, owner_id, business_proof_url")
  .like("business_proof_url", `%${PUBLIC_PREFIX}%`);
if (error) throw error;

console.log(`${shops.length} proof(s) to move${dryRun ? " (dry run)" : ""}`);

let moved = 0;
for (const shop of shops) {
  const oldPath = decodeURIComponent(shop.business_proof_url.split(PUBLIC_PREFIX)[1].split("?")[0]);
  const newPath = `${shop.owner_id || "unowned"}/${oldPath}`;
  const newUrl = `${url}/storage/v1/object/authenticated/shop-proofs/${newPath}`;
  console.log(`- ${shop.name} (${shop.id}): shop-documents/${oldPath} -> shop-proofs/${newPath}`);
  if (dryRun) continue;

  const { data: blob, error: dlErr } = await sb.storage.from("shop-documents").download(oldPath);
  if (dlErr) {
    console.error(`  download failed: ${dlErr.message}`);
    continue;
  }
  const { error: upErr } = await sb.storage
    .from("shop-proofs")
    .upload(newPath, blob, { contentType: blob.type || undefined, upsert: true });
  if (upErr) {
    console.error(`  upload failed: ${upErr.message}`);
    continue;
  }
  const { error: dbErr } = await sb.from("shops").update({ business_proof_url: newUrl }).eq("id", shop.id);
  if (dbErr) {
    console.error(`  updating shop row failed (copy kept in both buckets): ${dbErr.message}`);
    continue;
  }
  // Only delete the public copy once the row points at the private one.
  const { error: rmErr } = await sb.storage.from("shop-documents").remove([oldPath]);
  if (rmErr) console.error(`  moved, but deleting the public copy failed: ${rmErr.message}`);
  moved++;
}

if (!dryRun) console.log(`Done: ${moved}/${shops.length} moved.`);
