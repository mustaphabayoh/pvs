// Application settings are a small, schema-validated key/value store so the
// admin UI can only write keys the API knows how to interpret.
const { Setting } = require('../models')

const DEFINITIONS = [
  {
    key: 'site_name',
    label: 'Site name',
    type: 'string',
    default: 'Port Vehicle System',
    description: 'Name shown in the application header and emails.'
  },
  {
    key: 'support_email',
    label: 'Support email',
    type: 'string',
    default: '',
    description: 'Address users are told to contact for account help.'
  },
  {
    key: 'allow_self_registration',
    label: 'Allow importer self-registration',
    type: 'boolean',
    default: true,
    description: 'When disabled, only administrators can create accounts.'
  },
  {
    key: 'max_failed_logins',
    label: 'Failed logins before lockout',
    type: 'integer',
    default: 5,
    min: 1,
    max: 20
  },
  {
    key: 'lockout_minutes',
    label: 'Lockout duration (minutes)',
    type: 'integer',
    default: 15,
    min: 1,
    max: 1440
  },
  {
    key: 'session_timeout_minutes',
    label: 'Session timeout (minutes)',
    type: 'integer',
    default: 480,
    min: 5,
    max: 10080
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance mode',
    type: 'boolean',
    default: false,
    description: 'Show a maintenance banner to all users.'
  }
]

const BY_KEY = new Map(DEFINITIONS.map(d => [d.key, d]))

function defaults(){
  const out = {}
  for(const def of DEFINITIONS) out[def.key] = def.default
  return out
}

function deserialize(def, raw){
  if(raw === null || raw === undefined) return def.default
  if(def.type === 'boolean') return raw === 'true'
  if(def.type === 'integer'){
    const n = parseInt(raw, 10)
    return Number.isNaN(n) ? def.default : n
  }
  return raw
}

function coerce(def, value){
  if(def.type === 'boolean'){
    if(typeof value === 'boolean') return { value }
    if(value === 'true' || value === 'false') return { value: value === 'true' }
    return { error: `${def.key} must be a boolean` }
  }
  if(def.type === 'integer'){
    const n = typeof value === 'number' ? value : parseInt(value, 10)
    if(!Number.isInteger(n)) return { error: `${def.key} must be an integer` }
    if(def.min !== undefined && n < def.min) return { error: `${def.key} must be at least ${def.min}` }
    if(def.max !== undefined && n > def.max) return { error: `${def.key} must be at most ${def.max}` }
    return { value: n }
  }
  if(typeof value !== 'string') return { error: `${def.key} must be a string` }
  if(value.length > 255) return { error: `${def.key} must be 255 characters or fewer` }
  return { value: value.trim() }
}

async function getSettings(){
  const rows = await Setting.findAll()
  const values = defaults()
  for(const row of rows){
    const def = BY_KEY.get(row.key)
    if(def) values[def.key] = deserialize(def, row.value)
  }
  return values
}

// Returns { values } on success, or { errors } listing every rejected key.
async function updateSettings(patch, { updatedBy } = {}){
  const errors = []
  const accepted = []

  for(const [key, raw] of Object.entries(patch)){
    const def = BY_KEY.get(key)
    if(!def){
      errors.push({ field: key, message: 'Unknown setting' })
      continue
    }
    const { value, error } = coerce(def, raw)
    if(error) errors.push({ field: key, message: error })
    else accepted.push([def, value])
  }

  if(errors.length) return { errors }

  for(const [def, value] of accepted){
    await Setting.upsert({
      key: def.key,
      value: String(value),
      updated_by: updatedBy || null,
      updated_at: new Date()
    })
  }

  return { values: await getSettings() }
}

module.exports = { DEFINITIONS, defaults, getSettings, updateSettings }
