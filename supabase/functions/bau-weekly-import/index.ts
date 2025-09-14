import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Admin client (service role) for storage access only
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('BAU Weekly Import function called');
    
    const { path, upload_id } = await req.json();
    console.log('Processing upload:', { path, upload_id });

    // Create a per-request DB client that carries the caller's JWT
    const authHeader = req.headers.get('Authorization') || '';
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    
    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1) Download from Storage
    console.log('Downloading file from storage:', path);
    const { data: fileData, error: dlErr } = await admin.storage
      .from("bau-weekly-uploads")
      .download(path);
    
    if (dlErr) {
      console.error('Storage download error:', dlErr);
      throw dlErr;
    }

    // 2) Parse XLSX
    console.log('Parsing XLSX file');
    const buf = await fileData.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }); // array of arrays

    console.log('Found', rows.length, 'rows in Excel file');

    if (rows.length < 2) {
      throw new Error("No data rows found in Excel file");
    }

    // Header row: [date_from, date_to, customer, metric1, metric2, ...]
    const header = rows[0] as (string | number)[];
    const metricHeaders = (header.slice(3) as string[]).map(h => String(h).trim());
    
    console.log('Metric headers found:', metricHeaders);

    let processedRows = 0;
    let errorRows = 0;

    // Process each data row
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as any[];
      if (!r || r.length < 3) {
        console.warn(`Skipping row ${i + 1}: insufficient data`);
        continue;
      }

      try {
        // Parse dates from Excel (handles both numeric serials and text like DD/MM/YYYY)
        const parseExcelDate = (v: any): Date => {
          if (v == null || v === '') return new Date(NaN);
          if (typeof v === 'number') {
            const dc: any = XLSX.SSF.parse_date_code(v);
            // Construct a UTC date from components to avoid timezone shifts
            return new Date(Date.UTC(dc.y, (dc.m || 1) - 1, dc.d || 1, dc.H || 0, dc.M || 0, Math.floor(dc.s || 0)));
          }
          if (typeof v === 'string') {
            const s = v.trim();
            // Support UK format DD/MM/YYYY
            const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (m) {
              const d = parseInt(m[1], 10);
              const mth = parseInt(m[2], 10) - 1;
              const y = parseInt(m[3], 10);
              return new Date(Date.UTC(y, mth, d));
            }
            const d2 = new Date(s);
            if (!isNaN(d2.getTime())) return d2;
          }
          return new Date(NaN);
        };
        const dateFrom = parseExcelDate(r[0]);
        const dateTo = parseExcelDate(r[1]);
        
        const customerName = String(r[2] ?? "").trim();
        
        if (!customerName || isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
          console.warn(`Skipping row ${i + 1}: invalid date or customer name`);
          continue;
        }

        console.log(`Processing row ${i + 1} for customer: ${customerName}`);

        // Find BAU customer id
        const { data: bauIdRes, error: idErr } = await db.rpc("find_bau_customer_id", { 
          p_customer_name: customerName 
        });
        
        if (idErr) {
          console.error(`Error finding customer "${customerName}":`, idErr);
          throw idErr;
        }
        
        let bau_customer_id = bauIdRes as string | null;
        
        // If customer doesn't exist, create a new one
        if (!bau_customer_id) {
          console.log(`Customer "${customerName}" not found, creating new BAU customer`);
          
          // First, create or find a default company for external customers
          let companyId: string | null = null;
          
          // Try to find or create a company based on customer name
          const { data: existingCompanies, error: companySearchErr } = await db
            .from('companies')
            .select('id, name')
            .ilike('name', `%${customerName}%`)
            .limit(1);
            
          if (companySearchErr) {
            console.error('Error searching for companies:', companySearchErr);
          } else if (existingCompanies && existingCompanies.length > 0) {
            companyId = existingCompanies[0].id;
            console.log(`Found existing company for customer: ${existingCompanies[0].name}`);
          } else {
            // Create a new company
            const { data: newCompany, error: createCompanyErr } = await db
              .from('companies')
              .insert({ name: customerName, is_internal: false })
              .select('id')
              .single();
              
            if (createCompanyErr) {
              console.error('Error creating company:', createCompanyErr);
              // Fall back to no company
              companyId = null;
            } else {
              companyId = newCompany.id;
              console.log(`Created new company: ${customerName}`);
            }
          }
          
          // Create the BAU customer directly to ensure created_by is set
          const { data: uid, error: uidErr } = await db.rpc('auth_user_id');
          if (uidErr || !uid) {
            console.error('Unable to resolve auth user id for created_by', uidErr);
            errorRows++;
            continue;
          }

          if (!companyId) {
            console.error('Cannot create BAU customer without a company_id');
            errorRows++;
            continue;
          }

          const { data: newCustomer, error: insertErr } = await db
            .from('bau_customers')
            .insert({
              company_id: companyId,
              name: customerName,
              created_by: uid as string,
            })
            .select('id')
            .single();
          
          if (insertErr) {
            console.error(`Error inserting BAU customer "${customerName}":`, insertErr);
            errorRows++;
            continue;
          }
          
          bau_customer_id = newCustomer.id as string;
          console.log(`Created new BAU customer "${customerName}" with ID: ${bau_customer_id}`);
        }

        // Upsert each metric
        for (let mIdx = 0; mIdx < metricHeaders.length; mIdx++) {
          const key = metricHeaders[mIdx];
          const rawVal = r[3 + mIdx];

          let numVal: number | null = null;
          let textVal: string | null = null;

          if (rawVal === null || rawVal === undefined || rawVal === "") {
            numVal = null; 
            textVal = null;
          } else if (typeof rawVal === "number") {
            numVal = rawVal; 
            textVal = null;
          } else {
            const parsed = Number(String(rawVal).replace(/[, ]/g, ""));
            if (!Number.isNaN(parsed)) {
              numVal = parsed;
            } else {
              textVal = String(rawVal);
            }
          }

          const { error: upErr } = await db.rpc("upsert_bau_weekly_metric", {
            p_bau_customer_id: bau_customer_id,
            p_date_from: dateFrom.toISOString().slice(0, 10),
            p_date_to: dateTo.toISOString().slice(0, 10),
            p_metric_key: key,
            p_metric_value_numeric: numVal,
            p_metric_value_text: textVal,
            p_source_upload_id: upload_id ?? null
          });
          
          if (upErr) {
            console.error(`Error upserting metric ${key} for customer ${customerName}:`, upErr);
            throw upErr;
          }
        }

        processedRows++;
      } catch (rowError) {
        console.error(`Error processing row ${i + 1}:`, rowError);
        errorRows++;
      }
    }

    // Mark upload as processed
    if (upload_id) {
      console.log('Marking upload as processed:', upload_id);
      const { error: updateErr } = await db
        .from("bau_weekly_uploads")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", upload_id);
      
      if (updateErr) {
        console.error('Error updating upload status:', updateErr);
      }
    }

    console.log(`Processing complete. Processed: ${processedRows}, Errors: ${errorRows}`);

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Metrics ingested successfully",
      processedRows,
      errorRows,
      totalMetrics: processedRows * metricHeaders.length
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('BAU Weekly Import error:', e);
    return new Response(JSON.stringify({ 
      error: String(e),
      message: "Failed to process BAU weekly upload"
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});