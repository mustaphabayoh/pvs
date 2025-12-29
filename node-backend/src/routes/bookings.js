const express = require('express')
const router = express.Router()
const { Booking, Verified, Container, Importer, Shipment, Payment, WishList } = require('../models')
const auth = require('../middleware/auth')

router.post('/', auth(['IMPORTER','QUAY_OPERATOR','ADMIN']), async (req, res) => {
  try{
    // Support both old and new booking creation formats
    const { 
      ImporterID, 
      ShipmentID, 
      document_type, 
      containers, 
      BookingReference,
      // New format fields
      verification_id,
      shipment_id,
      booking_reference,
      its_sc_ida_number,
      notes,
      status,
      // accept snake_case importer_id
      importer_id
    } = req.body
    
    // FRAUD PREVENTION: Define allowed document types that bypass verification
    const exemptDocumentTypes = ['MANUAL_RELEASE', 'DUTY_FREE']
    
    // Use new format if provided, otherwise fall back to old format
    const finalImporterID = ImporterID || importer_id
    const finalShipmentID = shipment_id || ShipmentID
    const finalBookingReference = booking_reference || BookingReference
    const finalStatus = status || 'PENDING'
    const finalDocumentType = document_type || 'STANDARD'
    
    
    let final_verification_id = verification_id || null
    
    // FRAUD PREVENTION: Enforce verification requirements
    if(!exemptDocumentTypes.includes(finalDocumentType)) {
      // If verification_id not provided, try to find an approved/verified payment for this importer
      if(!verification_id) {
        // Attempt to auto-link to an approved payment by ImporterID
        let autoVerified = null
        if (finalImporterID) {
          autoVerified = await Payment.findOne({ where: { ImporterID: finalImporterID, Status: 'APPROVED' } })
          if (!autoVerified) {
            autoVerified = await Verified.findOne({ where: { ImporterID: finalImporterID, Status: 'VERIFIED' } })
          }
        }

        if (autoVerified) {
          final_verification_id = autoVerified.PaymentID ? `payment-${autoVerified.PaymentID}` : autoVerified.VerifiedID
        } else {
          return res.status(400).json({ 
            message: 'SECURITY ALERT: Booking requires verified payment for fraud prevention. Use verification_id from completed payment verification.',
            error_code: 'VERIFICATION_REQUIRED'
          })
        }
      }
      
      // Verify the payment is actually verified and completed
      // Check both Payment model (for APPROVED payments) and Verified model (for VERIFIED payments)
      let verified = null
      
      // First check if it's a payment ID (format: payment-X)
      if (final_verification_id && final_verification_id.toString().startsWith('payment-')) {
        const paymentId = final_verification_id.replace('payment-', '')
        verified = await Payment.findOne({
          where: {
            PaymentID: paymentId,
            Status: 'APPROVED'
          }
        })
      } else {
        // Check traditional verified table
        verified = await Verified.findOne({ 
          where: { 
            VerifiedID: final_verification_id, 
            Status: 'VERIFIED'
          } 
        })
      }
      
      if(!verified) {
        return res.status(403).json({ 
          message: 'SECURITY ALERT: Invalid or incomplete payment verification. Booking blocked to prevent fraud.',
          error_code: 'INVALID_VERIFICATION'
        })
      }
      
      final_verification_id = verified.PaymentID ? `payment-${verified.PaymentID}` : verified.VerifiedID
      
      // Note: allow multiple bookings per importer using the same verification (business requirement)
      // Previously we blocked duplicate bookings for the same verification; removing that restriction to allow multiple bookings

    } else {
      // For exempt document types, still check if there's a verification available
      if(document_type === 'STANDARD'){
        // Check for approved payment first, then verified payment
        let verified = await Payment.findOne({ 
          where: { ImporterID: finalImporterID, Status: 'APPROVED' } 
        })
        
        if (!verified) {
          verified = await Verified.findOne({ 
            where: { ImporterID: finalImporterID, Status: 'VERIFIED' } 
          })
        }
        
        if(!verified) {
          return res.status(400).json({ 
            message: 'STANDARD document requires an APPROVED payment or VERIFIED payment' 
          })
        }
        
        final_verification_id = verified.PaymentID ? `payment-${verified.PaymentID}` : verified.VerifiedID
      }
    }
    
    const created_by_user_id = req.user && req.user.id ? req.user.id : null
    const bookingData = { 
      ShipmentID: finalShipmentID, 
      Status: finalStatus,
      document_type: finalDocumentType,
      created_at: new Date(),
      // Audit trail for fraud prevention
      created_by_user: req.user?.username || 'unknown',
      verification_bypass_reason: exemptDocumentTypes.includes(finalDocumentType) ? `Document type ${finalDocumentType} exempt from verification` : null
    }
    
    if(finalImporterID) bookingData.ImporterID = finalImporterID
    if(finalBookingReference) bookingData.BookingReference = finalBookingReference
    if(its_sc_ida_number) bookingData.ITSCVCIDANumber = its_sc_ida_number
    if(final_verification_id) {
      // Enforce one booking per payment: if verification references a payment, block duplicate booking creation
      if (typeof final_verification_id === 'string' && final_verification_id.startsWith('payment-')) {
        const existing = await Booking.findOne({ where: { verification_id: final_verification_id } })
        if (existing) return res.status(409).json({ message: 'A booking already exists for this payment' })
      }
      bookingData.verification_id = final_verification_id
    }
    if(notes) bookingData.notes = notes
    if(created_by_user_id) bookingData.created_by_user_id = created_by_user_id
    
    const b = await Booking.create(bookingData)
    
    // handle containers array if provided
    if(Array.isArray(containers) && containers.length){
      for(const cnum of containers){
        await Container.create({ BookingID: b.BookingID, ContainerNumber: cnum })
      }

      // Immediately create wishlist items for created containers so they're ready for scanning
      const containersCreated = await Container.findAll({ where: { BookingID: b.BookingID } })
      for (const container of containersCreated) {
        // Check for existing wishlist item
        const exists = await WishList.findOne({ where: { BookingID: b.BookingID, ContainerID: container.ContainerID } })
        if (!exists) {
          await WishList.create({ BookingID: b.BookingID, ContainerID: container.ContainerID, Status: 'READY_FOR_SCANNING', CreatedDate: new Date(), UpdatedDate: new Date() })
        }
      }
    }
    
    // Fetch full booking with containers for response
    const full = await Booking.findByPk(b.BookingID, { include: [{ model: Container }] })

    const response = {
      id: full.BookingID,
      booking_reference: full.BookingReference,
      verification_id: full.verification_id,
      shipment_id: full.ShipmentID,
      its_sc_ida_number: full.ITSCVCIDANumber,
      document_type: full.document_type,
      Containers: full.Containers ? full.Containers.map(c => ({ container_number: c.ContainerNumber })) : [],
      notes: full.notes,
      status: full.Status,
      created_at: full.created_at
    }

    return res.status(201).json(response)
  } catch(err) { 
    console.error(err) 
    return res.status(400).json({ message: err.message }) 
  }
})

// list bookings (optionally filter by ImporterID)
// This route returns persisted bookings only (no suggested bookings are returned)
router.get('/', auth(), async (req, res) => {
  try{
    const ImporterID = req.query.ImporterID
    const where = ImporterID ? { ImporterID } : {}

    // Fetch persisted bookings
    const list = await Booking.findAll({ where, include: [Container] })

    const formattedList = list.map(booking => ({
      id: booking.BookingID,
      booking_reference: booking.BookingReference,
      verification_id: booking.verification_id,
      shipment_id: booking.ShipmentID,
      its_sc_ida_number: booking.ITSCVCIDANumber,
      document_type: booking.document_type,
      containers: booking.Containers ? booking.Containers.map(c => c.ContainerNumber) : [],
      Containers: booking.Containers ? booking.Containers.map(c => ({ container_number: c.ContainerNumber })) : [],
      notes: booking.notes,
      status: booking.Status,
      created_at: booking.created_at,
      // Legacy fields for compatibility
      BookingID: booking.BookingID,
      ImporterID: booking.ImporterID,
      ShipmentID: booking.ShipmentID,
      Status: booking.Status,
      BookingReference: booking.BookingReference,
      ITSCVCIDANumber: booking.ITSCVCIDANumber,
      suggested: false
    }))

    // Return only persisted bookings; no suggested bookings are returned per configuration
    return res.json(formattedList)
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

// update booking status (e.g. RELEASED, CANCELLED, COMPLETED)
router.post('/:id/status', auth(['QUAY_OPERATOR','ADMIN']), async (req, res) => {
  try{
    const id = req.params.id
    const { status } = req.body
    const allowedStatuses = ['RELEASED','CANCELLED','COMPLETED']
    if(!allowedStatuses.includes(status)) return res.status(400).json({ message: 'invalid status' })
    const b = await Booking.findByPk(id)
    if(!b) return res.status(404).json({ message: 'not found' })

    // transition rules: 
    // PENDING -> RELEASED or CANCELLED
    // RELEASED -> COMPLETED or CANCELLED
    const validTransitions = {
      'PENDING': ['RELEASED', 'CANCELLED'],
      // Once RELEASED, booking can only go to COMPLETED (no backward CANCELLED allowed)
      'RELEASED': ['COMPLETED']
    }
    
    if(!validTransitions[b.Status] || !validTransitions[b.Status].includes(status)) {
      return res.status(400).json({ message: `Cannot change status from ${b.Status} to ${status}` })
    }

    // role-specific checks: CANCELLED requires ADMIN
    if(status === 'CANCELLED' && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'insufficient privileges to cancel' })

    b.Status = status
    
    // When marking as COMPLETED, also set PaymentVerified and ReadyForScanning
    if(status === 'COMPLETED') {
      b.PaymentVerified = true
      b.ReadyForScanning = true
    }
    
    await b.save()
    
    // Auto-generate wishlist items if booking becomes COMPLETED
    if(status === 'COMPLETED') {
      const { WishList, Container } = require('../models')
      
      // Get all containers for this booking
      const containers = await Container.findAll({
        where: { BookingID: b.BookingID }
      })
      
      // Create wishlist items for each container
      for (const container of containers) {
        // Check if wishlist item already exists
        const existingWishlistItem = await WishList.findOne({
          where: {
            BookingID: b.BookingID,
            ContainerID: container.ContainerID
          }
        })
        
        if (!existingWishlistItem) {
          await WishList.create({
            BookingID: b.BookingID,
            ContainerID: container.ContainerID,
            Status: 'READY_FOR_SCANNING',
            CreatedDate: new Date(),
            UpdatedDate: new Date()
          })
        }
      }
    }
    
    const full = await Booking.findByPk(b.BookingID, { include: [{ model: Container, as: 'Containers' }] })
    // Return normalized response with snake_case status and Containers with container_number
    return res.json({
      id: full.BookingID,
      booking_reference: full.BookingReference,
      verification_id: full.verification_id,
      shipment_id: full.ShipmentID,
      its_sc_ida_number: full.ITSCVCIDANumber,
      document_type: full.document_type,
      Containers: full.Containers ? full.Containers.map(c => ({ container_number: c.ContainerNumber })) : [],
      notes: full.notes,
      status: full.Status,
      created_at: full.created_at
    })
  }catch(err){ console.error(err); return res.status(400).json({ message: err.message }) }
})

module.exports = router



