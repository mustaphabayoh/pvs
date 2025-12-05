const express = require('express')
const router = express.Router()
const { User } = require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cfg = require('../config')

router.post('/register', async (req, res) => {
  try{
    const { username, password, role } = req.body
    if(!username || !password || !role) return res.status(400).json({ message: 'Missing fields' })
    const exists = await User.findOne({ where: { username }})
    if(exists) return res.status(400).json({ message: 'username already exists' })
    const hash = await bcrypt.hash(password, 10)
    const u = await User.create({ username, password_hash: hash, role })
    return res.status(201).json({ id: u.id, username: u.username, role: u.role })
  }catch(err){
    console.error(err); return res.status(500).json({ message: 'server error' })
  }
})

router.post('/login', async (req, res) => {
  try{
    const { username, password } = req.body
    const user = await User.findOne({ where: { username }})
    if(!user) return res.status(400).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if(!ok) return res.status(400).json({ message: 'Invalid credentials' })
    const token = jwt.sign({ sub: user.username, role: user.role, id: user.id }, cfg.jwt.secret, { expiresIn: cfg.jwt.expiresIn })
    return res.json({ access_token: token, token_type: 'bearer' })
  }catch(err){ console.error(err); return res.status(500).json({ message: 'server error' }) }
})

module.exports = router


