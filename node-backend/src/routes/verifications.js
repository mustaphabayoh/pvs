const express = require('express')
const router = express.Router()
const { Verified } = require('../models')
const { authorize } = require('../middleware/auth')
const { PERMISSIONS } = require('../rbac')

// Importer submits verification
router.post('/', authorize(PERMISSIONS.VERIFICATION_CREATE), async (req, res) => {
  try{
    const payload = req.body
    if(payload.amount < 0) return res.status(400).json({message: 'amount cannot be negative'})
    const v = await Verified.create(payload)
    return res.status(201).json(v)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// Customs list pending
router.get('/pending', authorize(PERMISSIONS.VERIFICATION_REVIEW), async (req, res) => {
  const pending = await Verified.findAll({ where: { status: 'PENDING' } })
  return res.json(pending)
})

// Customs update status
router.post('/:id/status', authorize(PERMISSIONS.VERIFICATION_REVIEW), async (req, res) => {
  try{
    const id = req.params.id
    const { status } = req.body
    const ver = await Verified.findByPk(id)
    if(!ver) return res.status(404).json({ message: 'not found' })
    ver.status = status
    await ver.save()
    const slip = { verification_id: ver.id, reference_number: ver.reference_number, status: ver.status, amount: ver.amount, currency_code: ver.currency_code }
    return res.json({ verification: ver, slip })
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

module.exports = router


