const express = require('express')
const router = express.Router()
const { User } = require('../models')
const auth = require('../middleware/auth')

// List users (paginated) - ADMIN only
router.get('/users', auth(['ADMIN']), async (req, res) => {
  try{
    const limit = Math.min(parseInt(req.query.limit || '10'), 100)
    const page = Math.max(parseInt(req.query.page || '1'), 1)
    const offset = (page - 1) * limit
    const { count, rows } = await User.findAndCountAll({ limit, offset })
    return res.json({ total: count, page, per_page: limit, data: rows })
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// Update user role
router.put('/users/:id', auth(['ADMIN']), async (req, res) => {
  try{
    const id = req.params.id
    const { role } = req.body
    const u = await User.findByPk(id)
    if(!u) return res.status(404).json({ message: 'not found' })
    u.role = role
    await u.save()
    return res.json(u)
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

// Delete user
router.delete('/users/:id', auth(['ADMIN']), async (req, res) => {
  try{
    const id = req.params.id
    const u = await User.findByPk(id)
    if(!u) return res.status(404).json({ message: 'not found' })
    await u.destroy()
    return res.json({ ok: true })
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

module.exports = router
