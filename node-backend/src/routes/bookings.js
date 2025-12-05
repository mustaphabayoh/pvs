const express = require('express')
const router = express.Router()
const { Booking, Verified, Container } = require('../models')
const auth = require('../middleware/auth')

router.post('/', auth(['IMPORTER','QUAY_OPERATOR','ADMIN']), async (req, res) => {
  try{
    const { importer_id, shipment_id, document_type, containers } = req.body
    if(document_type === 'STANDARD'){
      const verified = await Verified.findOne({ where: { importer_id, status: 'VERIFIED' } })
      if(!verified) return res.status(400).json({ message: 'STANDARD document requires a VERIFIED payment' })
    }
    const b = await Booking.create({ importer_id, shipment_id, document_type })
    // handle containers array if provided
    if(Array.isArray(containers) && containers.length){
      for(const cnum of containers){
        await Container.create({ booking_id: b.id, container_number: cnum })
      }
    }
    return res.status(201).json(b)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// list bookings (optionally filter by importer_id)
router.get('/', auth(), async (req, res) => {
  try{
    const importer_id = req.query.importer_id
    const where = importer_id ? { importer_id } : {}
    const list = await Booking.findAll({ where })
    return res.json(list)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// get booking details
router.get('/:id', auth(), async (req, res) => {
  try{
    const id = req.params.id
    const b = await Booking.findByPk(id)
    if(!b) return res.status(404).json({ message: 'not found' })
    return res.json(b)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

module.exports = router


