import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('Building domain → provider_id map...')
  const map = {}
  let page = 0
  while (true) {
    const { data } = await supabase.from('providers')
      .select('id, domain, website')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    for (const row of data) {
      if (row.domain) map[row.domain.toLowerCase()] = row.id
      if (row.website) {
        const m = row.website.match(/(?:https?:\/\/)?(?:www\.)?([^/?#\s]+)/)
        if (m) { const d = m[1].toLowerCase(); if (!map[d]) map[d] = row.id }
      }
    }
    page++
    if (data.length < 1000) break
  }
  console.log(`Map entries: ${Object.keys(map).length}`)
  fs.writeFileSync('domain_map.json', JSON.stringify(map, null, 2))
  console.log('✅ Saved domain_map.json')
}

run().catch(console.error)
