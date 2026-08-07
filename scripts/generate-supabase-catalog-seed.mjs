#!/usr/bin/env node
/**
 * Generates supabase/seed_catalog.sql from src/data/demo.ts runtime values.
 * Run: node scripts/generate-supabase-catalog-seed.mjs
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Dynamic import of compiled isn't available; emit SQL from duplicated minimal seed.
// Instead call vite-node or inline generation by reading demo via tsx.

console.log("Use: npx tsx scripts/generate-supabase-catalog-seed.ts");
