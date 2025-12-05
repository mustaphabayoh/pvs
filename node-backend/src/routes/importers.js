const express = require('express')
const router = express.Router()
const { Importer } = require('../models')
const auth = require('../middleware/auth')

// Create importer (Admin / Customs / Importer)
router.post('/', auth(['ADMIN','CUSTOMS_OFFICER','IMPORTER']), async (req, res) => {
  try{
    const { name, customs_registration_number, contact_email } = req.body
    if(!name || !customs_registration_number) return res.status(400).json({ message: 'Missing fields' })
    const created = await Importer.create({ name, customs_registration_number, contact_email })
    return res.status(201).json(created)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

router.get('/', auth(), async (req, res) => {
  const list = await Importer.findAll()
  return res.json(list)
})

// Get single importer
router.get('/:id', auth(), async (req, res) => {
  const id = req.params.id
  const imp = await Importer.findByPk(id)
  if(!imp) return res.status(404).json({ message: 'not found' })
  return res.json(imp)
})

// Update importer (Admin or Importer)
router.put('/:id', auth(['ADMIN','IMPORTER']), async (req, res) => {
  try{
    const id = req.params.id
    const imp = await Importer.findByPk(id)
    if(!imp) return res.status(404).json({ message: 'not found' })
    const { name, customs_registration_number, contact_email } = req.body
    if(name !== undefined) imp.name = name
    if(customs_registration_number !== undefined) imp.customs_registration_number = customs_registration_number
    if(contact_email !== undefined) imp.contact_email = contact_email
    await imp.save()
    return res.json(imp)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// Delete importer (Admin only)
router.delete('/:id', auth(['ADMIN']), async (req, res) => {
  try{
    const id = req.params.id
    const imp = await Importer.findByPk(id)
    if(!imp) return res.status(404).json({ message: 'not found' })
    await imp.destroy()
    return res.json({ ok: true })
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

module.exports = router


